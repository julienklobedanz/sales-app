import type { DealRow, DealStatus } from './types'
import type { StatusFilterValue } from './deals-table-constants'

const TERMINAL_DEAL_STATUSES = new Set<DealStatus>([
  'won',
  'lost',
  'archived',
  'withdrawn',
])

export function formatDealTableDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
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
