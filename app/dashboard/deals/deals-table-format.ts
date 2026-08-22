import { daysUntil } from '@/lib/deal-desk/timeline-display'

import type { DealRow, DealStatus } from './types'
import type { StatusFilterValue } from './deals-table-constants'

const TERMINAL_DEAL_STATUSES = new Set<DealStatus>([
  'won',
  'lost',
  'archived',
  'withdrawn',
])

/** Handlungsabstand für Sammelspalten: „in 4 Tagen" / „vor 2 Tagen", ohne Kalenderdatum. */
export function formatDealCollectionDeadline(
  iso: string,
  now: Date = new Date(),
): string {
  const days = daysUntil(iso, now)
  if (days === 0) return 'heute'
  if (days === 1) return 'in 1 Tag'
  if (days === -1) return 'vor 1 Tag'
  if (days > 1) return `in ${days} Tagen`
  return `vor ${Math.abs(days)} Tagen`
}

export function isDealExpiringIn30Days(
  dateStr: string | null,
  status?: DealStatus | string | null,
): boolean {
  if (!dateStr) return false
  const normalized = String(status ?? '').toLowerCase() as DealStatus
  if (TERMINAL_DEAL_STATUSES.has(normalized)) return false
  const end = new Date(dateStr)
  if (Number.isNaN(end.getTime())) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return days >= 0 && days <= 30
}

export function filterDealsTableRows({
  deals,
  query,
  statusFilter,
}: {
  deals: DealRow[]
  query: string
  statusFilter: StatusFilterValue
}): DealRow[] {
  let list = deals
  if (statusFilter !== 'all') {
    list = list.filter((d) => d.status === statusFilter)
  }
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((d) => {
    const hay =
      `${d.title} ${d.company_name ?? ''} ${d.account_manager_name ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}
