import type { DealStatus } from '@/app/dashboard/deals/types'

const LEGACY_STATUS_MAP: Record<string, DealStatus> = {
  in_negotiation: 'negotiation',
  rfp_phase: 'rfp',
  on_hold: 'open',
  reference_sought: 'open',
  in_approval: 'open',
  reference_found: 'open',
}

const CANONICAL: ReadonlySet<string> = new Set([
  'open',
  'rfp',
  'negotiation',
  'won',
  'lost',
  'withdrawn',
  'archived',
])

/** Maps legacy + canonical deal statuses; unknown/empty → `open`. */
export function normalizeDealStatus(raw: unknown): DealStatus {
  const s = String(raw ?? '').trim()
  if (!s) return 'open'
  const mapped = LEGACY_STATUS_MAP[s]
  if (mapped) return mapped
  if (CANONICAL.has(s)) return s as DealStatus
  return 'open'
}

/** Like normalizeDealStatus, but empty input → null (for optional prefills). */
export function parseOptionalDealStatus(raw: unknown): DealStatus | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  return normalizeDealStatus(s)
}

export function isActiveDealStatus(raw: unknown): boolean {
  const s = String(raw ?? '').trim()
  if (!s) return false
  const mapped = LEGACY_STATUS_MAP[s]
  const status = mapped ?? (CANONICAL.has(s) ? (s as DealStatus) : null)
  if (!status) return false
  return status === 'open' || status === 'rfp' || status === 'negotiation'
}
