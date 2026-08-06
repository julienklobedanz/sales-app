import type { AccountStatusValue } from './account-status'

const STATUS_SORT_RANK: Record<AccountStatusValue, number> = {
  at_risk: 0,
  active_customer: 1,
  target: 2,
  former_customer: 3,
}

export function accountStatusSortRank(
  status: AccountStatusValue | null | undefined,
): number {
  if (!status) return 99
  return STATUS_SORT_RANK[status] ?? 99
}

/** Frühestes relevantes Ablaufdatum für Sortierung innerhalb einer Status-Gruppe. */
export function nextUrgencySortKey(isoDates: Array<string | null | undefined>): number {
  let min = Number.POSITIVE_INFINITY
  for (const raw of isoDates) {
    if (!raw?.trim()) continue
    const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    min = Math.min(min, d.getTime())
  }
  return min
}
