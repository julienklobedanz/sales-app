import { MARKET_SIGNAL_INTELLIGENCE_SYSTEM_PROMPT } from '@/lib/market-signals/signal-intelligence-prompt'
import { truncateToCompleteSentences } from '@/lib/market-signals/compelling-event'
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

function parseLlmEnrichmentJson(
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
  const fact = clampText(row.insight_signal_fact, 280)
  const whyNow = truncateToCompleteSentences(String(row.insight_why_now ?? ''), 180) ?? ''
  if (!fact || !whyNow) return null

  return {
    is_relevant: parseRelevanceFlag(row.is_relevant),
    signal_category: normalizeCategory(row.signal_category, fallbackCategory),
    insight_signal_fact: fact,
    insight_why_now: whyNow,
  }
}

/** Heuristischer Fallback wenn kein API-Key oder LLM-Aufruf fehlschlägt. */
export function buildHeuristicSignalEnrichment(input: EnrichSignalInput): SignalEnrichment {
  const title = String(input.title ?? '').trim()
  const companyName = String(input.companyName ?? '').trim() || 'dem Account'
  const personName = String(input.personName ?? '').trim()
  const signalKind = personName ? 'exec' : 'news'

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

  const insight_why_now =
    truncateToCompleteSentences(
      buildSalesWhyNow({
        signalKind,
        personName: personName || undefined,
        companyName,
        changeSummary: title,
        newsBody: title,
      }),
      180
    ) ?? ''

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

  const userPrompt = `Analysiere diese RSS-Schlagzeile für B2B-Vertrieb (IT/SaaS, DACH).

Firma: ${companyName || '—'}
${personName ? `Person (Executive): ${personName}` : 'Kontext: Unternehmens-News (kein Executive-Fokus)'}
Schlagzeile: ${title}

Antworte NUR mit JSON (kein Markdown, keine Code-Fences):
{
  "is_relevant": boolean,
  "signal_category": "people" | "finance" | "strategy",
  "insight_signal_fact": string,
  "insight_why_now": string
}

Regeln für dieses RSS-Ingest-Format:
- is_relevant=false IMMER bei: Stellenanzeigen (m/w/d), Recruiting, Karriere-Seiten, Praktika, Facility/Instandhaltung ohne strategischen Kontext, Employer Branding, Sport/Unterhaltung, generisches PR.
- is_relevant=true nur bei echten Vertriebs-Triggern, z. B.: Führungswechsel (CEO/CTO/CIO), Werkseröffnung/Expansion/Investition, M&A/Partnerschaft, Quartalszahlen/Budget, Digitalisierung/Strategie, große Aufträge, Standort-/Markteintritt.
- signal_category: people bei Personal/Führungswechsel; finance bei Finanzen, M&A, Budget, Quartalszahlen; strategy bei Strategie, Produkt, Expansion, Digitalisierung.
- insight_signal_fact: knackiges Kurzfazit für UI-Label (max. 2 Sätze).
- insight_why_now: beschreibender Inhalt der News in 1–2 ganzen Sätzen (max. ~180 Zeichen). Immer mit Satzende (. ! ?) abschließen — niemals mit Auslassungspunkten kürzen.`

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
          { role: 'system', content: MARKET_SIGNAL_INTELLIGENCE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      const snippet = body.trim().slice(0, 240)
      throw new Error(
        `Marktsignal-Enrichment: HTTP ${res.status}${snippet ? ` — ${snippet}` : ''}`
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

/**
 * Reichert eine RSS-Schlagzeile per LLM an. Bei Fehler oder fehlendem API-Key: heuristischer Fallback.
 * Bei LLM-Erfolg und is_relevant=false soll der Aufrufer den Eintrag überspringen.
 */
export async function enrichSignal(input: EnrichSignalInput): Promise<SignalEnrichment> {
  const title = String(input.title ?? '').trim()
  const companyName = String(input.companyName ?? '').trim()
  const personName = String(input.personName ?? '').trim()
  const fallbackCategory: SignalCategory = personName ? 'people' : inferNewsCategory(title)

  if (title.length < 8) {
    return { ...buildHeuristicSignalEnrichment(input), is_relevant: false }
  }

  if (isLowValueRssTitle(title)) {
    return irrelevantEnrichment()
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    const heuristic = buildHeuristicSignalEnrichment(input)
    if (!personName && !hasSalesTriggerHint(title)) {
      return { ...heuristic, is_relevant: false }
    }
    return heuristic
  }

  try {
    const llm = await callOpenAiEnrichment(apiKey, input, fallbackCategory)
    if (!llm) {
      const heuristic = buildHeuristicSignalEnrichment(input)
      if (!personName && !hasSalesTriggerHint(title)) {
        return { ...heuristic, is_relevant: false }
      }
      return heuristic
    }
    if (!llm.is_relevant) {
      return { ...llm, enrichment_source: 'llm' }
    }
    if (!personName && !hasSalesTriggerHint(title)) {
      return { ...llm, is_relevant: false, enrichment_source: 'llm' }
    }
    return { ...llm, enrichment_source: 'llm' }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[enrichSignal] LLM fallback:', msg)
    }
    return buildHeuristicSignalEnrichment(input)
  }
}
