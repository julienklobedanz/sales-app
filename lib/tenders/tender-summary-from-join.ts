import { accountFromJoin } from '@/lib/accounts/account-from-join'
import type { DealRow } from '@/app/(app)/deals/types'

export type DealTenderSummary = NonNullable<DealRow['tender']>

export function tenderSummaryFromJoin(raw: unknown): DealTenderSummary | null {
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') return null
  const tender = row as {
    id?: string
    title?: string | null
    company_id?: string | null
    procedure_type?: string | null
    reference_number?: string | null
    total_volume?: string | null
    companies?: unknown
  }
  const id = String(tender.id ?? '').trim()
  if (!id) return null
  const company = accountFromJoin(tender.companies)
  return {
    id,
    title: String(tender.title ?? '').trim(),
    company_id: tender.company_id ?? company?.id ?? null,
    company_name: company?.name ?? null,
    company_logo_url: company?.logoUrl ?? null,
    procedure_type: tender.procedure_type ?? null,
    reference_number: tender.reference_number ?? null,
    total_volume: tender.total_volume ?? null,
  }
}
