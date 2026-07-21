import { MARKET_SIGNAL_RSS_ENRICHMENT_SYSTEM_PROMPT } from '@/lib/market-signals/signal-intelligence-prompt'
import {
  sanitizeCompellingEventForDisplay,
  truncateToCompleteSentences,
} from '@/lib/market-signals/compelling-event'
import {
  hasSalesTriggerHint,
  isLowValueRssTitle,
  irrelevantEnrichment,
} from '@/lib/market-signals/sales-signal-relevance'
import {
  buildSalesWhyNow,
  extractEmbeddedSignalHook,
  formatRoleChangeFact,
} from '@/lib/market-signals/signal-intelligence'
import {
  fetchUrlMetaSnippet,
  shouldFetchMetaSnippets,
} from '@/lib/market-signals/fetch-url-meta-snippet'
import { log } from '@/lib/observability/logger'

const MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 20_000

export type SignalCategory = 'people' | 'finance' | 'strategy'

export type SignalEnrichment = {
  is_relevant: boolean
  signal_category: SignalCategory
  insight_signal_fact: string
  insight_why_now: string
  enrichment_source: 'llm' | 'heuristic'
}

export type EnrichSignalInput = {
  title: string
  companyName: string
  personName?: string
  /** Optional: RSS-Description / Kurzsnippet — kein Full-Article. */
  snippet?: string | null
  /** Optional: Artikel-URL für Meta-Fetch wenn MARKET_SIGNALS_FETCH_META=1. */
  sourceUrl?: string | null
}

function inferNewsCategory(raw: string): 'finance' | 'strategy' {
  const t = String(raw ?? '').toLowerCase()
  if (
    /(budget|umsatz|revenue|quartal|q1|q2|q3|q4|profit|finanz|ebit|cost|invest|capex|opex|übernahme|acquisition|funding|finanzierung)/.test(
      t
    )
  ) {
    return 'finance'
  }
  return 'strategy'
}

function normalizeCategory(raw: unknown, fallback: SignalCategory): SignalCategory {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'people' || v === 'finance' || v === 'strategy') return v
  return fallback
}

function clampText(raw: unknown, maxLen: number): string {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 1).trim()}…`
}

function parseRelevanceFlag(raw: unknown): boolean {
  if (raw === false || raw === 0) return false
  if (typeof raw === 'string' && /^(false|0|no|nein)$/i.test(raw.trim())) return false
  return true
}

function pickWhyNowField(row: Record<string, unknown>): string {
  const flat = row.insight_why_now
  if (typeof flat === 'string' && flat.trim()) return flat
  const insight = row.insight
  if (insight && typeof insight === 'object') {
    const nested = (insight as Record<string, unknown>).why_now
    if (typeof nested === 'string' && nested.trim()) return nested
  }
  return ''
}

function pickFactField(row: Record<string, unknown>): string {
  const flat = row.insight_signal_fact
  if (typeof flat === 'string' && flat.trim()) return flat
  const insight = row.insight
  if (insight && typeof insight === 'object') {
    const nested = (insight as Record<string, unknown>).signal_fact
    if (typeof nested === 'string' && nested.trim()) return nested
  }
  return ''
}

/** Export für Tests. */
export function parseLlmEnrichmentJson(
  raw: string,
  fallbackCategory: SignalCategory
): Omit<SignalEnrichment, 'enrichment_source'> | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const row = parsed as Record<string, unknown>
  const fact = clampText(pickFactField(row), 280)
  const whyNow =
    sanitizeCompellingEventForDisplay(pickWhyNowField(row), 180) ??
    truncateToCompleteSentences(pickWhyNowField(row), 180) ??
    ''
  if (!fact || !whyNow) return null

  return {
    is_relevant: parseRelevanceFlag(row.is_relevant),
    signal_category: normalizeCategory(row.signal_category, fallbackCategory),
    insight_signal_fact: fact,
    insight_why_now: whyNow,
  }
}

/**
 * Heuristischer Fallback: faktische Headline, kein Product-Pitch-Boilerplate.
 * Lieber knapper Why-now als Einheits-„Cloud-Infrastruktur“-Text.
 */
export function buildHeuristicSignalEnrichment(input: EnrichSignalInput): SignalEnrichment {
  const title = String(input.title ?? '').trim()
  const companyName = String(input.companyName ?? '').trim() || 'dem Account'
  const personName = String(input.personName ?? '').trim()
  const snippet = String(input.snippet ?? '').trim()
  const signalKind = personName ? 'exec' : 'news'
  const bodyForWhy = snippet && snippet.length > title.length ? `${title}. ${snippet}` : title

  const hook =
    extractEmbeddedSignalHook({
      signalKind,
      newsBody: title,
      changeSummary: title,
      personName: personName || undefined,
      companyName,
    }) ?? title

  const insight_signal_fact =
    signalKind === 'exec' && personName
      ? formatRoleChangeFact({
          personName,
          personTitleBefore: null,
          personTitleAfter: null,
          companyName,
          changeSummary: title,
        })
      : clampText(hook, 280) || `Account-Signal bei ${companyName}.`

  // Kein solutionLabel → kein Cloud-Pitch in buildSalesWhyNow
  const insight_why_now =
    sanitizeCompellingEventForDisplay(
      buildSalesWhyNow({
        signalKind,
        personName: personName || undefined,
        companyName,
        changeSummary: title,
        newsBody: bodyForWhy.slice(0, 200),
      }),
      180
    ) ??
    truncateToCompleteSentences(title, 180) ??
    ''

  const signal_category: SignalCategory = personName ? 'people' : inferNewsCategory(title)

  return {
    is_relevant: true,
    signal_category,
    insight_signal_fact,
    insight_why_now,
    enrichment_source: 'heuristic',
  }
}

async function callOpenAiEnrichment(
  apiKey: string,
  input: EnrichSignalInput,
  fallbackCategory: SignalCategory
): Promise<Omit<SignalEnrichment, 'enrichment_source'> | null> {
  const title = String(input.title ?? '').trim()
  const companyName = String(input.companyName ?? '').trim()
  const personName = String(input.personName ?? '').trim()
  const snippet = String(input.snippet ?? '').trim().slice(0, 400)

  const userPrompt = `Analysiere diese RSS-Schlagzeile für B2B-Vertrieb (IT/SaaS, DACH).

Firma: ${companyName || '—'}
${personName ? `Person (Executive): ${personName}` : 'Kontext: Unternehmens-News (kein Executive-Fokus)'}
Schlagzeile: ${title}
${snippet ? `Snippet: ${snippet}` : 'Snippet: —'}

Antworte NUR mit JSON (kein Markdown, keine Code-Fences) im flachen Schema:
{
  "is_relevant": boolean,
  "signal_category": "people" | "finance" | "strategy",
  "insight_signal_fact": string,
  "insight_why_now": string
}

- insight_why_now = Compelling Event (1–2 Sätze, satzvollständig).
- Keine Product-Pitch-Floskeln, nichts erfinden.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: MARKET_SIGNAL_RSS_ENRICHMENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      const snippetBody = body.trim().slice(0, 240)
      throw new Error(
        `Marktsignal-Enrichment: HTTP ${res.status}${snippetBody ? ` — ${snippetBody}` : ''}`
      )
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = json.choices?.[0]?.message?.content?.trim()
    if (!content) return null

    return parseLlmEnrichmentJson(content, fallbackCategory)
  } finally {
    clearTimeout(timeout)
  }
}

function logEnrichResult(
  input: EnrichSignalInput,
  result: SignalEnrichment,
  extra?: Record<string, unknown>
) {
  log.info('market_signal.enrich', {
    label: 'market_signal.enrich',
    source: result.enrichment_source,
    relevant: result.is_relevant,
    category: result.signal_category,
    hasSnippet: Boolean(input.snippet?.trim()),
    titleLen: input.title.trim().length,
    ...extra,
  })
}

/**
 * Reichert eine RSS-Schlagzeile per LLM an.
 * Bei Fehler/fehlendem Key: faktische Heuristik ohne Product-Boilerplate.
 * Bei is_relevant=false soll der Aufrufer den Eintrag überspringen.
 */
export async function enrichSignal(input: EnrichSignalInput): Promise<SignalEnrichment> {
  const title = String(input.title ?? '').trim()
  const personName = String(input.personName ?? '').trim()
  let snippet = String(input.snippet ?? '').trim() || null
  const fallbackCategory: SignalCategory = personName ? 'people' : inferNewsCategory(title)

  if (
    !snippet &&
    shouldFetchMetaSnippets() &&
    input.sourceUrl &&
    /^https?:\/\//i.test(input.sourceUrl)
  ) {
    snippet = await fetchUrlMetaSnippet(input.sourceUrl)
  }

  const enrichedInput: EnrichSignalInput = { ...input, snippet }

  if (title.length < 8) {
    const result = { ...buildHeuristicSignalEnrichment(enrichedInput), is_relevant: false }
    logEnrichResult(enrichedInput, result, { reason: 'title_too_short' })
    return result
  }

  if (isLowValueRssTitle(title)) {
    const result = irrelevantEnrichment()
    logEnrichResult(enrichedInput, result, { reason: 'low_value_title' })
    return result
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    const heuristic = buildHeuristicSignalEnrichment(enrichedInput)
    const result =
      !personName && !hasSalesTriggerHint(title)
        ? { ...heuristic, is_relevant: false }
        : heuristic
    logEnrichResult(enrichedInput, result, { reason: 'missing_api_key' })
    return result
  }

  try {
    const llm = await callOpenAiEnrichment(apiKey, enrichedInput, fallbackCategory)
    if (!llm) {
      const heuristic = buildHeuristicSignalEnrichment(enrichedInput)
      const result =
        !personName && !hasSalesTriggerHint(title)
          ? { ...heuristic, is_relevant: false }
          : heuristic
      logEnrichResult(enrichedInput, result, { reason: 'llm_parse_null' })
      return result
    }
    let result: SignalEnrichment = { ...llm, enrichment_source: 'llm' }
    if (!llm.is_relevant) {
      logEnrichResult(enrichedInput, result, { reason: 'llm_irrelevant' })
      return result
    }
    if (!personName && !hasSalesTriggerHint(title)) {
      result = { ...llm, is_relevant: false, enrichment_source: 'llm' }
      logEnrichResult(enrichedInput, result, { reason: 'no_sales_trigger_hint' })
      return result
    }
    logEnrichResult(enrichedInput, result)
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.warn('market_signal.enrich_llm_error', {
      label: 'market_signal.enrich_llm_error',
      message: msg.slice(0, 240),
    })
    const heuristic = buildHeuristicSignalEnrichment(enrichedInput)
    const result =
      !personName && !hasSalesTriggerHint(title)
        ? { ...heuristic, is_relevant: false }
        : heuristic
    logEnrichResult(enrichedInput, result, { reason: 'llm_exception' })
    return result
  }
}
