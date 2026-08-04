import { MASTER_INDUSTRIES, formatIndustryDisplay, resolveIndustryId } from '@/lib/constants/industries'
import type { MatchReferenceHit, MatchReferenceFilters } from '@/lib/match/match-types'
import type { DealRow } from '@/app/dashboard/deals/types'
import { parseStoredVolumeEur } from '@/lib/match/parse-smart-match-query'
import type { ParsedSmartMatchConstraints } from '@/lib/match/parse-smart-match-query'
import {
  VOLUME_BAND_OPTIONS,
  volumeBandFromMinVolume,
  rpcVolumeBoundsFromBands,
  rpcRecencyBoundsFromMonthsBackList,
  type VolumeBandId,
} from '@/lib/match/smart-match-multi-filters'

export const SUGGESTIONS = [
  { label: '>2 Mio €', q: 'Projekte über 2 Mio Euro im Enterprise-Umfeld' },
  { label: 'ISO 27001', q: 'ISO 27001 Security Nachweise und Zertifikate' },
  { label: 'Managed Services', q: 'Managed Services 24/7 für Industrieunternehmen' },
]

export type FiltersState = {
  industries: string[]
  volumeBands: VolumeBandId[]
  statuses: string[]
  monthsBackList: number[]
  excludeYears: number[]
  excludeIndustryIds: string[]
  excludeTerms: string[]
}
export const EMPTY_FILTERS: FiltersState = {
  industries: [],
  volumeBands: [],
  statuses: [],
  monthsBackList: [],
  excludeYears: [],
  excludeIndustryIds: [],
  excludeTerms: [],
}

/** Session-Persistenz: Browser-Zurück nach Referenz-Details behält Treffer. */
const SMART_MATCH_SESSION_KEY = 'refstack:smart-match:last-search:v3'

export type SmartMatchSessionState = {
  query: string
  filters: FiltersState
  selectedDealId: string | null
  results: MatchReferenceHit[]
}

export function normalizeFilters(raw: Partial<FiltersState> | undefined): FiltersState {
  const legacy = raw as Partial<FiltersState> & {
    minVolume?: number | null
    maxVolume?: number | null
    monthsBack?: number | null
  }
  let volumeBands = Array.isArray(legacy?.volumeBands)
    ? legacy.volumeBands.filter((b): b is VolumeBandId =>
        VOLUME_BAND_OPTIONS.some((o) => o.value === b)
      )
    : []
  if (!volumeBands.length) {
    if (typeof legacy?.maxVolume === 'number' && legacy.minVolume == null) {
      volumeBands = ['lt1']
    } else if (typeof legacy?.minVolume === 'number') {
      const band = volumeBandFromMinVolume(legacy.minVolume)
      if (band) volumeBands = [band]
    }
  }
  let monthsBackList = Array.isArray(legacy?.monthsBackList)
    ? legacy.monthsBackList.filter((n): n is number => typeof n === 'number')
    : []
  if (!monthsBackList.length && typeof legacy?.monthsBack === 'number') {
    monthsBackList = [legacy.monthsBack]
  }
  return {
    industries: Array.isArray(legacy?.industries) ? legacy.industries.map(String) : [],
    volumeBands,
    statuses: Array.isArray(legacy?.statuses) ? legacy.statuses.map(String) : [],
    monthsBackList,
    excludeYears: Array.isArray(legacy?.excludeYears)
      ? legacy.excludeYears.filter((n): n is number => typeof n === 'number' && n >= 2000 && n <= 2100)
      : [],
    excludeIndustryIds: Array.isArray(legacy?.excludeIndustryIds)
      ? legacy.excludeIndustryIds.map(String)
      : [],
    excludeTerms: Array.isArray(legacy?.excludeTerms) ? legacy.excludeTerms.map(String) : [],
  }
}

export function readSmartMatchSession(): SmartMatchSessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      sessionStorage.getItem(SMART_MATCH_SESSION_KEY) ??
      sessionStorage.getItem('refstack:smart-match:last-search:v2')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SmartMatchSessionState>
    if (typeof parsed.query !== 'string' || !Array.isArray(parsed.results)) return null
    return {
      query: parsed.query,
      filters: normalizeFilters(parsed.filters),
      selectedDealId:
        typeof parsed.selectedDealId === 'string' ? parsed.selectedDealId : null,
      results: parsed.results as MatchReferenceHit[],
    }
  } catch {
    return null
  }
}

export function writeSmartMatchSession(state: SmartMatchSessionState | null) {
  if (typeof window === 'undefined') return
  try {
    if (!state) {
      sessionStorage.removeItem(SMART_MATCH_SESSION_KEY)
      return
    }
    sessionStorage.setItem(SMART_MATCH_SESSION_KEY, JSON.stringify(state))
  } catch {
    // Quota / private mode — Suche funktioniert weiter ohne Persistenz.
  }
}

export const RECENCY_OPTIONS: { label: string; value: number }[] = [
  { label: 'Letzte 12 Monate', value: 12 },
  { label: 'Letzte 24 Monate', value: 24 },
  { label: 'Letzte 36 Monate', value: 36 },
  { label: 'Älter als 12 Monate', value: -12 },
  { label: 'Älter als 24 Monate', value: -24 },
  { label: 'Älter als 36 Monate', value: -36 },
]
export const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Freigegeben', value: 'approved' },
  { label: 'Intern', value: 'internal_only' },
  { label: 'Anonymisiert', value: 'anonymized' },
  { label: 'Extern', value: 'external' },
  { label: 'Entwurf', value: 'draft' },
]
export const INDUSTRY_OPTIONS: { label: string; value: string }[] = MASTER_INDUSTRIES.map((ind) => ({
  label: ind.labelDe,
  value: ind.id,
}))

export function toApiFilters(f: FiltersState): MatchReferenceFilters {
  const volumeBounds = rpcVolumeBoundsFromBands(f.volumeBands)
  const recencyBounds = rpcRecencyBoundsFromMonthsBackList(f.monthsBackList)
  return {
    industries: f.industries.length ? f.industries : null,
    excludeIndustries: f.excludeIndustryIds.length ? f.excludeIndustryIds : null,
    excludeTerms: f.excludeTerms.length ? f.excludeTerms : null,
    minVolume: volumeBounds.minVolume,
    maxVolume: volumeBounds.maxVolume,
    volumeBands: f.volumeBands.length ? f.volumeBands : null,
    statuses: f.statuses.length ? f.statuses : null,
    createdAfter: recencyBounds.createdAfter,
    createdBefore: recencyBounds.createdBefore,
    monthsBackList: f.monthsBackList.length ? f.monthsBackList : null,
    excludeCreatedYears: f.excludeYears.length ? f.excludeYears : null,
  }
}

export function filtersActive(f: FiltersState): boolean {
  return (
    f.industries.length > 0 ||
    f.volumeBands.length > 0 ||
    f.statuses.length > 0 ||
    f.monthsBackList.length > 0 ||
    f.excludeYears.length > 0 ||
    f.excludeIndustryIds.length > 0 ||
    f.excludeTerms.length > 0
  )
}

export function filtersFromParsed(parsed: ParsedSmartMatchConstraints): FiltersState {
  const band =
    parsed.minVolume != null ? volumeBandFromMinVolume(parsed.minVolume) : null
  return {
    industries: parsed.industryId ? [parsed.industryId] : [],
    volumeBands: band ? [band] : [],
    statuses: [],
    monthsBackList: parsed.monthsBack != null ? [parsed.monthsBack] : [],
    excludeYears: parsed.excludeYears,
    excludeIndustryIds: parsed.excludeIndustryIds,
    excludeTerms: parsed.excludeTerms,
  }
}

export function filtersFromDeal(deal: DealRow | null): Partial<FiltersState> {
  if (!deal) return {}
  const industryId = resolveIndustryId(deal.industry)
  const vol = parseStoredVolumeEur(deal.volume)
  const band = vol != null ? volumeBandFromMinVolume(vol) : null
  return {
    industries: industryId ? [industryId] : [],
    volumeBands: band ? [band] : [],
  }
}

/** Query-Filter haben Vorrang; Deal füllt leere Dimensionen hart vor. */
export function mergeDealPrefills(queryFilters: FiltersState, deal: DealRow | null): FiltersState {
  const dealF = filtersFromDeal(deal)
  return {
    ...queryFilters,
    industries: queryFilters.industries.length
      ? queryFilters.industries
      : (dealF.industries ?? []),
    volumeBands: queryFilters.volumeBands.length
      ? queryFilters.volumeBands
      : (dealF.volumeBands ?? []),
  }
}

function multiFilterLabel(
  emptyLabel: string,
  selectedLabels: string[]
): string {
  if (!selectedLabels.length) return emptyLabel
  if (selectedLabels.length === 1) return selectedLabels[0]!
  return `${emptyLabel} (${selectedLabels.length})`
}

export function industryFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Branche',
    f.industries.map(
      (id) => MASTER_INDUSTRIES.find((i) => i.id === id)?.labelDe ?? id
    )
  )
}

export function volumeFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Volumen',
    f.volumeBands.map(
      (b) => VOLUME_BAND_OPTIONS.find((o) => o.value === b)?.label ?? b
    )
  )
}

export function statusFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Status',
    f.statuses.map((id) => STATUS_OPTIONS.find((s) => s.value === id)?.label ?? id)
  )
}

export function recencyFilterLabel(f: FiltersState): string {
  const parts = [
    ...f.monthsBackList.map((m) => {
      if (m < 0) return `Älter als ${Math.abs(m)} Mon.`
      return `Letzte ${m} Mon.`
    }),
    ...f.excludeYears.map((y) => `Ohne ${y}`),
  ]
  return multiFilterLabel('Aktualität', parts)
}

export type ConstraintChip = {
  key: string
  label: string
  clear: (f: FiltersState) => FiltersState
}

export function constraintChips(f: FiltersState): ConstraintChip[] {
  const chips: ConstraintChip[] = []
  for (const id of f.industries) {
    chips.push({
      key: `ind:${id}`,
      label: MASTER_INDUSTRIES.find((i) => i.id === id)?.labelDe ?? id,
      clear: (prev) => ({
        ...prev,
        industries: prev.industries.filter((x) => x !== id),
      }),
    })
  }
  for (const id of f.excludeIndustryIds) {
    chips.push({
      key: `exind:${id}`,
      label: `Ohne ${MASTER_INDUSTRIES.find((i) => i.id === id)?.labelDe ?? id}`,
      clear: (prev) => ({
        ...prev,
        excludeIndustryIds: prev.excludeIndustryIds.filter((x) => x !== id),
      }),
    })
  }
  for (const b of f.volumeBands) {
    chips.push({
      key: `vol:${b}`,
      label: VOLUME_BAND_OPTIONS.find((o) => o.value === b)?.label ?? b,
      clear: (prev) => ({
        ...prev,
        volumeBands: prev.volumeBands.filter((x) => x !== b),
      }),
    })
  }
  for (const m of f.monthsBackList) {
    chips.push({
      key: `rec:${m}`,
      label: m < 0 ? `Älter als ${Math.abs(m)} Mon.` : `Letzte ${m} Mon.`,
      clear: (prev) => ({
        ...prev,
        monthsBackList: prev.monthsBackList.filter((x) => x !== m),
      }),
    })
  }
  for (const y of f.excludeYears) {
    chips.push({
      key: `year:${y}`,
      label: `Ohne ${y}`,
      clear: (prev) => ({
        ...prev,
        excludeYears: prev.excludeYears.filter((x) => x !== y),
      }),
    })
  }
  for (const t of f.excludeTerms) {
    chips.push({
      key: `term:${t}`,
      label: `Ohne ${t}`,
      clear: (prev) => ({
        ...prev,
        excludeTerms: prev.excludeTerms.filter((x) => x !== t),
      }),
    })
  }
  for (const s of f.statuses) {
    chips.push({
      key: `st:${s}`,
      label: STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
      clear: (prev) => ({
        ...prev,
        statuses: prev.statuses.filter((x) => x !== s),
      }),
    })
  }
  return chips
}

/** Deal-Kontext für den KI-Entwurf (Ghostwriter) — aus den DealRow-Feldern. */
export function dealContextString(d: DealRow | null): string | null {
  if (!d) return null
  const parts = [
    d.title ? `Deal: ${d.title}` : null,
    d.company_name ? `Account: ${d.company_name}` : null,
    d.industry ? `Branche: ${formatIndustryDisplay(d.industry)}` : null,
    d.volume ? `Volumen: ${d.volume}` : null,
    d.requirements_text?.trim() ? `Anforderungen:\n${d.requirements_text.trim()}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join('\n\n') : null
}
