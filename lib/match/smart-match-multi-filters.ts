import { parseStoredVolumeEur } from '@/lib/match/parse-smart-match-query'
import { resolveIndustryId } from '@/lib/constants/industries'

/** Volumen-Bänder für Smart-Match-Mehrfachfilter (OR). */
export type VolumeBandId = 'lt1' | 'gte1' | 'gte2' | 'gte5' | 'gte10'

export const VOLUME_BAND_OPTIONS: { label: string; value: VolumeBandId }[] = [
  { label: '< 1 Mio €', value: 'lt1' },
  { label: '≥ 1 Mio €', value: 'gte1' },
  { label: '≥ 2 Mio €', value: 'gte2' },
  { label: '≥ 5 Mio €', value: 'gte5' },
  { label: '≥ 10 Mio €', value: 'gte10' },
]

export function volumeMatchesBand(amountEur: number, band: VolumeBandId): boolean {
  switch (band) {
    case 'lt1':
      return amountEur < 1_000_000
    case 'gte1':
      return amountEur >= 1_000_000
    case 'gte2':
      return amountEur >= 2_000_000
    case 'gte5':
      return amountEur >= 5_000_000
    case 'gte10':
      return amountEur >= 10_000_000
  }
}

/** True wenn keine Bänder gesetzt ODER Volumen in mindestens einem Band liegt. */
export function volumeMatchesAnyBand(
  volumeEur: string | null | undefined,
  bands: VolumeBandId[] | null | undefined,
): boolean {
  if (!bands?.length) return true
  const n = parseStoredVolumeEur(volumeEur)
  if (n == null) return false
  return bands.some((b) => volumeMatchesBand(n, b))
}

export function volumeBandFromMinVolume(minVolume: number): VolumeBandId | null {
  if (minVolume >= 10_000_000) return 'gte10'
  if (minVolume >= 5_000_000) return 'gte5'
  if (minVolume >= 2_000_000) return 'gte2'
  if (minVolume >= 1_000_000) return 'gte1'
  return null
}

/** Einzelnes Band → optionale RPC-Vorfilter (min/max). Mehrere Bänder → null (nur Client-OR). */
export function rpcVolumeBoundsFromBands(bands: VolumeBandId[]): {
  minVolume: number | null
  maxVolume: number | null
} {
  if (bands.length !== 1) return { minVolume: null, maxVolume: null }
  switch (bands[0]) {
    case 'lt1':
      return { minVolume: null, maxVolume: 999_999 }
    case 'gte1':
      return { minVolume: 1_000_000, maxVolume: null }
    case 'gte2':
      return { minVolume: 2_000_000, maxVolume: null }
    case 'gte5':
      return { minVolume: 5_000_000, maxVolume: null }
    case 'gte10':
      return { minVolume: 10_000_000, maxVolume: null }
  }
}

type RecencyWindow = { after: string | null; before: string | null }

function recencyWindowFromMonthsBack(
  monthsBack: number,
  now = new Date(),
): RecencyWindow {
  if (monthsBack > 0) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - monthsBack)
    return { after: d.toISOString(), before: null }
  }
  const d = new Date(now)
  d.setMonth(d.getMonth() - Math.abs(monthsBack))
  return { after: null, before: d.toISOString() }
}

export function createdAtMatchesAnyRecency(
  createdAt: string | null | undefined,
  monthsBackList: number[] | null | undefined,
  now = new Date(),
): boolean {
  if (!monthsBackList?.length) return true
  if (!createdAt) return false
  // AND: widersprüchliche Fenster (z. B. „letzte 12“ + „älter als 36“) → kein Treffer.
  return monthsBackList.every((m) => {
    const w = recencyWindowFromMonthsBack(m, now)
    if (w.after && createdAt < w.after) return false
    if (w.before && createdAt >= w.before) return false
    return true
  })
}

/** Einzelnes Fenster → RPC-Vorfilter; mehrere → null (Client-AND). */
export function rpcRecencyBoundsFromMonthsBackList(monthsBackList: number[]): {
  createdAfter: string | null
  createdBefore: string | null
} {
  if (monthsBackList.length !== 1) {
    return { createdAfter: null, createdBefore: null }
  }
  const w = recencyWindowFromMonthsBack(monthsBackList[0]!)
  return { createdAfter: w.after, createdBefore: w.before }
}

/** True wenn Ankerdatum in keinem der ausgeschlossenen Kalenderjahre liegt. */
export function createdAtMatchesExcludeYears(
  createdAt: string | null | undefined,
  excludeYears: number[] | null | undefined,
): boolean {
  if (!excludeYears?.length) return true
  if (!createdAt) return false
  const year = new Date(createdAt).getUTCFullYear()
  if (!Number.isFinite(year)) return false
  return !excludeYears.includes(year)
}

export function industryMatchesExcludeList(
  industry: string | null | undefined,
  excludeIndustries: string[] | null | undefined,
): boolean {
  if (!excludeIndustries?.length) return true
  const raw = String(industry ?? '').trim()
  if (!raw) return true
  const resolved = resolveIndustryId(raw) ?? raw.toLowerCase()
  return !excludeIndustries.some((id) => {
    const ex = id.toLowerCase()
    return resolved === ex || raw.toLowerCase().includes(ex)
  })
}

export function textMatchesExcludeTerms(
  haystack: string,
  excludeTerms: string[] | null | undefined,
): boolean {
  if (!excludeTerms?.length) return true
  const h = haystack.toLowerCase()
  return !excludeTerms.some((term) => {
    const t = term.trim().toLowerCase()
    return t.length >= 2 && h.includes(t)
  })
}
