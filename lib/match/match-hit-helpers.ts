import { parseStoredVolumeEur } from '@/lib/match/parse-smart-match-query'
import {
  createdAtMatchesAnyRecency,
  createdAtMatchesExcludeYears,
  industryMatchesExcludeList,
  textMatchesExcludeTerms,
  volumeMatchesAnyBand,
} from '@/lib/match/smart-match-multi-filters'
import { matchReferenceDateAnchor } from '@/lib/match/reference-date-anchor'
import type { MatchReferenceHit, MatchReferencesOptions } from '@/lib/match/match-types'

/** Sentinel: Browse/Übersicht ohne semantischen Score (UI zeigt „—“). */
export const BROWSE_SIMILARITY_SENTINEL = -1

export function sortMatchesBySimilarityDesc(
  matches: MatchReferenceHit[],
): MatchReferenceHit[] {
  return [...matches].sort((a, b) => {
    // Browse-Sentinel (-1) ans Ende; sonst absteigend nach Score
    if (a.similarity < 0 && b.similarity < 0) return 0
    if (a.similarity < 0) return 1
    if (b.similarity < 0) return -1
    return b.similarity - a.similarity
  })
}

export function applyClientSideStructuralFilters(
  matches: MatchReferenceHit[],
  filters: MatchReferencesOptions['filters'] | undefined,
): MatchReferenceHit[] {
  if (!filters) return matches
  let next = matches

  if (filters.volumeBands?.length) {
    next = next.filter((m) => volumeMatchesAnyBand(m.volumeEur, filters.volumeBands))
  } else {
    if (typeof filters.minVolume === 'number') {
      const min = filters.minVolume
      next = next.filter((m) => {
        const n = parseStoredVolumeEur(m.volumeEur)
        return n != null && n >= min
      })
    }
    if (typeof filters.maxVolume === 'number') {
      const max = filters.maxVolume
      next = next.filter((m) => {
        const n = parseStoredVolumeEur(m.volumeEur)
        return n != null && n <= max
      })
    }
  }

  if (filters.monthsBackList?.length) {
    next = next.filter((m) =>
      createdAtMatchesAnyRecency(matchReferenceDateAnchor(m), filters.monthsBackList),
    )
  } else {
    if (filters.createdBefore) {
      const before = filters.createdBefore
      next = next.filter((m) => {
        const anchor = matchReferenceDateAnchor(m)
        return anchor != null && anchor < before
      })
    }
    if (filters.createdAfter) {
      const after = filters.createdAfter
      next = next.filter((m) => {
        const anchor = matchReferenceDateAnchor(m)
        return anchor != null && anchor >= after
      })
    }
  }

  if (filters.excludeCreatedYears?.length) {
    next = next.filter((m) =>
      createdAtMatchesExcludeYears(
        matchReferenceDateAnchor(m),
        filters.excludeCreatedYears,
      ),
    )
  }

  if (filters.excludeIndustries?.length) {
    next = next.filter((m) =>
      industryMatchesExcludeList(m.industry, filters.excludeIndustries),
    )
  }

  if (filters.excludeTerms?.length) {
    next = next.filter((m) =>
      textMatchesExcludeTerms(
        [m.title, m.summary ?? '', m.snippet, m.companyName ?? ''].join(' '),
        filters.excludeTerms,
      ),
    )
  }

  return next
}

/** Extrahiert ordered_ids aus Rohtext (inkl. ```json-Fence). */
export function parseOrderedIdsFromGptJson(raw: string): string[] | null {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  try {
    const obj = JSON.parse(s) as { ordered_ids?: unknown }
    const ids = obj?.ordered_ids
    if (!Array.isArray(ids)) return null
    return ids.map((x) => String(x).trim()).filter(Boolean)
  } catch {
    return null
  }
}
