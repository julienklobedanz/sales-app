import type { DealStatus } from '@/app/(app)/deals/types'
import { COPY } from '@/lib/copy'

import { countBidLots } from './derive-tender-status'

export type LotPriorityGapLot = {
  status: DealStatus
  lot_priority: number | null
}

export function shouldShowLotPriorityGap(args: {
  maxLotsAward: number | null
  lotPriorityRequired: boolean | null
  lots: readonly LotPriorityGapLot[]
}): boolean {
  if (args.maxLotsAward == null) return false
  if (args.lotPriorityRequired === false) return false
  if (countBidLots(args.lots.map((lot) => lot.status)) <= args.maxLotsAward) {
    return false
  }
  if (args.lots.some((lot) => lot.lot_priority != null)) return false
  return true
}

export function formatLotPriorityGapHint(bid: number, award: number): string {
  return COPY.tenders.priorityGapHint
    .replace('{bid}', String(bid))
    .replace('{award}', String(award))
}

export function orderLotsForPriorityList<T extends { lot_priority: number | null }>(
  lots: readonly T[],
): T[] {
  if (!lots.some((lot) => lot.lot_priority != null)) return [...lots]
  return lots
    .map((lot, index) => ({ lot, index }))
    .sort((a, b) => {
      const aRank = a.lot.lot_priority
      const bRank = b.lot.lot_priority
      if (aRank == null && bRank == null) return a.index - b.index
      if (aRank == null) return 1
      if (bRank == null) return -1
      if (aRank !== bRank) return aRank - bRank
      return a.index - b.index
    })
    .map((entry) => entry.lot)
}
