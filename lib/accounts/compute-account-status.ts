import type { CompanyAccountStatusValue } from './company-account-status'
import { NDA_EXPIRY_WARNING_DAYS } from './nda-expiry'

export const ACTIVE_CUSTOMER_WON_WINDOW_MS = 2 * 365 * 24 * 60 * 60 * 1000

export type DealStatusInput = {
  status: string
  /** Close-Datum aus CRM (expiry_date) oder Fallback */
  closedOn: string | null
}

export type ReferenceExpiryInput = {
  approval_expires_at: string | null
  approval_grace_until: string | null
}

export type ComputeAccountStatusInput = {
  crmAccountId: string | null
  deals: DealStatusInput[]
  references: ReferenceExpiryInput[]
  now?: Date
}

const OPEN_PIPELINE_STATUSES = new Set([
  'in_negotiation',
  'rfp_phase',
  'on_hold',
  'reference_sought',
  'in_approval',
  'reference_found',
])

function parseClosedOn(iso: string | null | undefined, now: Date): Date | null {
  if (!iso?.trim()) return null
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function referenceExpiresSoon(ref: ReferenceExpiryInput, now: Date): boolean {
  for (const raw of [ref.approval_expires_at, ref.approval_grace_until]) {
    if (!raw?.trim()) continue
    const end = new Date(raw)
    if (Number.isNaN(end.getTime())) continue
    const days = Math.round((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= NDA_EXPIRY_WARNING_DAYS) return true
  }
  return false
}

function latestWonDate(deals: DealStatusInput[], now: Date): Date | null {
  let latest: Date | null = null
  for (const deal of deals) {
    if (deal.status !== 'won') continue
    const closed = parseClosedOn(deal.closedOn, now)
    if (!closed) continue
    if (!latest || closed > latest) latest = closed
  }
  return latest
}

/**
 * Berechnet den Account-Status aus CRM-/Deal-/Referenz-Signalen (Phase 2).
 * Priorität: At Risk (Referenz) → Aktiver Kunde → Ehemaliger → Target.
 */
export function computeAccountStatusFromSignals(
  input: ComputeAccountStatusInput
): CompanyAccountStatusValue | null {
  const now = input.now ?? new Date()

  const hasExpiringReference = input.references.some((r) => referenceExpiresSoon(r, now))
  if (hasExpiringReference) return 'at_risk'

  const latestWon = latestWonDate(input.deals, now)
  if (latestWon) {
    const ageMs = now.getTime() - latestWon.getTime()
    if (ageMs <= ACTIVE_CUSTOMER_WON_WINDOW_MS) return 'active_customer'
    const hasNewerWon = input.deals.some((d) => {
      if (d.status !== 'won') return false
      const closed = parseClosedOn(d.closedOn, now)
      return closed != null && closed > latestWon
    })
    if (!hasNewerWon) return 'former_customer'
  }

  const hasOpenPipeline = input.deals.some((d) => OPEN_PIPELINE_STATUSES.has(d.status))
  if (hasOpenPipeline) return 'target'

  const hasCrmLink = Boolean(input.crmAccountId?.trim())
  const hasAnyDeal = input.deals.length > 0
  if (!hasCrmLink && !hasAnyDeal) return 'target'

  // CRM-verknüpft oder Deal-Historie ohne klares Won/Lost-Signal → Target bis manuell gesetzt
  if (hasCrmLink || hasAnyDeal) return 'target'

  return 'target'
}

export function dealClosedOnForStatus(args: {
  status: string
  expiry_date: string | null
  updated_at: string | null
  created_at: string | null
}): string | null {
  if (args.status !== 'won') return null
  return args.expiry_date ?? args.updated_at ?? args.created_at ?? null
}
