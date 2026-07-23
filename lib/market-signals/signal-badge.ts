import { isLeadershipMoveTitle, parseLeadershipMoveFromTitle } from '@/lib/market-signals/leadership-move'

export type MarketSignalBadge = 'Move' | 'Executive' | 'Company'

/** Badge für Executive-Events — gleiche Logik wie Feed-Cards. */
export function resolveExecSignalBadge(row: {
  personTitleBefore?: string | null
  personTitleAfter?: string | null
  eventKind?: string | null
  personName?: string | null
  changeSummary?: string | null
  insightSignalFact?: string | null
  signalCategory?: string | null
}): MarketSignalBadge {
  const before = row.personTitleBefore?.trim()
  const after = row.personTitleAfter?.trim()
  if (before || after) return 'Move'
  if (row.eventKind === 'role_change' && row.personName?.trim()) return 'Move'
  if (
    isLeadershipMoveTitle(row.changeSummary ?? '') ||
    isLeadershipMoveTitle(row.insightSignalFact ?? '')
  ) {
    return 'Move'
  }
  if (row.eventKind === 'news_mention') {
    if (row.signalCategory === 'people') return 'Executive'
    return 'Company'
  }
  return 'Executive'
}

/** Badge für Company-News — gleiche Logik wie Feed-Cards. */
export function resolveNewsSignalBadge(
  body: string,
  companyName?: string | null
): MarketSignalBadge {
  const moveParse = parseLeadershipMoveFromTitle(body, companyName ?? undefined)
  return moveParse.isLeadershipMove ? 'Move' : 'Company'
}

export function newsPersonNameFromBody(body: string, companyName?: string | null): string | null {
  return parseLeadershipMoveFromTitle(body, companyName ?? undefined).personName
}
