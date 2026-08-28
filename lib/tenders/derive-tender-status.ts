import type { DealStatus } from '@/app/(app)/deals/types'

const OPEN_STATUSES = new Set<DealStatus>(['open', 'rfp', 'negotiation'])
const EXCLUDED_STATUSES = new Set<DealStatus>(['withdrawn', 'archived'])

export type DerivedTenderStatus =
  | { kind: 'running'; won: number; bid: number }
  | { kind: 'won' }
  | { kind: 'lost' }
  | { kind: 'partially_won' }
  | { kind: 'empty' }

function lotsInBid(statuses: readonly DealStatus[]): DealStatus[] {
  return statuses.filter((status) => !EXCLUDED_STATUSES.has(status))
}

export function countBidLots(statuses: readonly DealStatus[]): number {
  return lotsInBid(statuses).length
}

export function deriveTenderStatus(statuses: readonly DealStatus[]): DerivedTenderStatus {
  const bid = lotsInBid(statuses)
  if (bid.length === 0) return { kind: 'empty' }

  const won = bid.filter((status) => status === 'won').length
  const lost = bid.filter((status) => status === 'lost').length
  const open = bid.filter((status) => OPEN_STATUSES.has(status)).length

  if (open > 0) {
    return { kind: 'running', won, bid: bid.length }
  }
  if (won === bid.length) return { kind: 'won' }
  if (lost === bid.length) return { kind: 'lost' }
  return { kind: 'partially_won' }
}
