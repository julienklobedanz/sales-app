import 'server-only'

import { MASTER_INDUSTRIES } from '@/lib/constants/industries'
import { formatOpenAiHttpError } from '@/lib/openai-api-errors'
import {
  parseSmartMatchQuery,
  snapMinVolumeEur,
  type ParsedSmartMatchConstraints,
} from '@/lib/match/parse-smart-match-query'
import { log } from '@/lib/observability/logger'

const MODEL = 'gpt-4o-mini'

const INDUSTRY_IDS = MASTER_INDUSTRIES.map((i) => i.id).join(', ')

const SYSTEM_PROMPT = `Du extrahierst strukturierte Smart-Match-Filter aus einer Vertriebs-Suchanfrage (Deutsch/Englisch).

Felder (nur setzen was klar gemeint ist, sonst null / []):
- minVolumeEur: Zahl in Euro (z. B. 2000000 für „über 2 Mio“)
- industryId: eine von [${INDUSTRY_IDS}] oder null (positive Branche)
- monthsBack: positiv = letzte N Monate (12/24/36), negativ = älter als |N| Monate (z. B. -12)
- excludeYears: Kalenderjahre ausschließen (z. B. [2026] für „nicht in 2026“)
- excludeIndustryIds: Branchen-Ids ausschließen (gleiche Id-Liste)
- excludeTerms: Freitext-Negationen ohne Branche (z. B. ["cloud","sap"])

Regeln:
- „älter als 1 Jahr“ → monthsBack: -12
- „Referenzen vor 2024“ / „nicht in 2024“ → excludeYears enthält 2024 (und ggf. spätere nur wenn explizit)
- „kein Banking“ / „ohne Healthcare“ → excludeIndustryIds, nicht industryId
- „ohne Cloud“ → excludeTerms, nicht industryId
- Keine Halluzinationen; lieber null/[] als raten

Antworte NUR mit JSON:
{"minVolumeEur":null,"industryId":null,"monthsBack":null,"excludeYears":[],"excludeIndustryIds":[],"excludeTerms":[]}`

function coerceParsed(raw: unknown): ParsedSmartMatchConstraints | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const industryIds = new Set(MASTER_INDUSTRIES.map((i) => i.id))

  let minVolume: number | null = null
  if (
    typeof o.minVolumeEur === 'number' &&
    Number.isFinite(o.minVolumeEur) &&
    o.minVolumeEur > 0
  ) {
    minVolume = snapMinVolumeEur(o.minVolumeEur)
  }

  let industryId: string | null = null
  if (typeof o.industryId === 'string' && industryIds.has(o.industryId)) {
    industryId = o.industryId
  }

  let monthsBack: number | null = null
  if (
    typeof o.monthsBack === 'number' &&
    Number.isFinite(o.monthsBack) &&
    o.monthsBack !== 0
  ) {
    monthsBack = Math.trunc(o.monthsBack)
  }

  const excludeYears = Array.isArray(o.excludeYears)
    ? o.excludeYears
        .filter((y): y is number => typeof y === 'number' && y >= 2000 && y <= 2100)
        .map((y) => Math.trunc(y))
    : []

  const excludeIndustryIds = Array.isArray(o.excludeIndustryIds)
    ? o.excludeIndustryIds.filter(
        (id): id is string => typeof id === 'string' && industryIds.has(id),
      )
    : []

  const excludeTerms = Array.isArray(o.excludeTerms)
    ? o.excludeTerms
        .filter((t): t is string => typeof t === 'string' && t.trim().length >= 2)
        .map((t) => t.trim().toLowerCase())
    : []

  if (industryId && excludeIndustryIds.includes(industryId)) industryId = null

  return {
    minVolume,
    industryId,
    monthsBack,
    excludeYears: [...new Set(excludeYears)].sort((a, b) => a - b),
    excludeIndustryIds: [...new Set(excludeIndustryIds)],
    excludeTerms: [...new Set(excludeTerms)],
    found: {
      volume: minVolume != null,
      industry: industryId != null,
      recency: monthsBack != null,
      excludeYears: excludeYears.length > 0,
      excludeIndustries: excludeIndustryIds.length > 0,
      excludeTerms: excludeTerms.length > 0,
    },
  }
}

function mergeParsed(
  primary: ParsedSmartMatchConstraints,
  fallback: ParsedSmartMatchConstraints,
): ParsedSmartMatchConstraints {
  const minVolume = primary.minVolume ?? fallback.minVolume
  const industryId = primary.industryId ?? fallback.industryId
  const monthsBack = primary.monthsBack ?? fallback.monthsBack
  const excludeYears = primary.excludeYears.length
    ? primary.excludeYears
    : fallback.excludeYears
  const excludeIndustryIds = primary.excludeIndustryIds.length
    ? primary.excludeIndustryIds
    : fallback.excludeIndustryIds
  const excludeTerms = primary.excludeTerms.length
    ? primary.excludeTerms
    : fallback.excludeTerms
  return {
    minVolume,
    industryId,
    monthsBack,
    excludeYears,
    excludeIndustryIds,
    excludeTerms,
    found: {
      volume: minVolume != null,
      industry: industryId != null,
      recency: monthsBack != null,
      excludeYears: excludeYears.length > 0,
      excludeIndustries: excludeIndustryIds.length > 0,
      excludeTerms: excludeTerms.length > 0,
    },
  }
}

/**
 * Heuristik + optional gpt-4o-mini für natürliche Filter-Sprache.
 * Bei API-Fehler/ohne Key: reine Heuristik.
 */
export async function resolveSmartMatchConstraints(
  query: string,
  apiKey?: string | null,
): Promise<ParsedSmartMatchConstraints> {
  const heuristic = parseSmartMatchQuery(query)
  const key = apiKey ?? process.env.OPENAI_API_KEY
  const q = query.trim()
  if (!key || q.length < 4) return heuristic

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: q.slice(0, 2000) },
        ],
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      log.warn('smartMatchParse.openAiFailed', {
        status: res.status,
        detail: formatOpenAiHttpError(res.status, t, 'Smart-Match-Filter'),
      })
      return heuristic
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return heuristic
    }

    const llm = coerceParsed(parsed)
    if (!llm) return heuristic
    return mergeParsed(llm, heuristic)
  } catch (e) {
    log.warn('smartMatchParse.failed', {}, e instanceof Error ? e : new Error(String(e)))
    return heuristic
  }
}
