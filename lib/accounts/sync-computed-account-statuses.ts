import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { CompanyAccountStatusValue } from './company-account-status'
import {
  computeAccountStatusFromSignals,
  dealClosedOnForStatus,
} from './compute-account-status'

export type CompanyStatusSyncRow = {
  id: string
  account_status: string | null
  account_status_source: string | null
  crm_account_id: string | null
  entity_kind: string | null
}

type DealRow = {
  company_id: string | null
  status: string
  expiry_date: string | null
  contract_end_date?: string | null
  updated_at: string | null
  created_at: string | null
}

type ReferenceRow = {
  company_id: string | null
  approval_expires_at: string | null
  approval_grace_until: string | null
}

/**
 * Wendet berechneten Status auf Accounts an.
 * Manuelle Status bleiben erhalten — außer At-Risk-Druck (Freigabe/Vertrag) überschreibt auf at_risk.
 */
export async function syncComputedAccountStatuses(
  supabase: SupabaseClient,
  companies: CompanyStatusSyncRow[],
  deals: DealRow[],
  references: ReferenceRow[]
): Promise<Record<string, CompanyAccountStatusValue | null>> {
  const dealsByCompany = new Map<string, DealRow[]>()
  for (const deal of deals) {
    if (!deal.company_id) continue
    const list = dealsByCompany.get(deal.company_id) ?? []
    list.push(deal)
    dealsByCompany.set(deal.company_id, list)
  }

  const refsByCompany = new Map<string, ReferenceRow[]>()
  for (const ref of references) {
    if (!ref.company_id) continue
    const list = refsByCompany.get(ref.company_id) ?? []
    list.push(ref)
    refsByCompany.set(ref.company_id, list)
  }

  const effectiveStatus: Record<string, CompanyAccountStatusValue | null> = {}

  for (const company of companies) {
    if ((company.entity_kind ?? 'account') === 'partner') continue

    const companyDeals = dealsByCompany.get(company.id) ?? []
    const companyRefs = refsByCompany.get(company.id) ?? []

    const computed = computeAccountStatusFromSignals({
      crmAccountId: company.crm_account_id,
      deals: companyDeals.map((d) => ({
        status: d.status,
        closedOn: dealClosedOnForStatus(d),
        contractEndDate: d.contract_end_date ?? null,
      })),
      references: companyRefs,
    })

    if (company.account_status_source === 'manual') {
      if (computed === 'at_risk') {
        effectiveStatus[company.id] = 'at_risk'
        if (company.account_status !== 'at_risk') {
          await supabase
            .from('companies')
            .update({
              account_status: 'at_risk',
              account_status_source: 'crm',
            } as { account_status: string | null; account_status_source: string })
            .eq('id', company.id)
        }
      } else {
        effectiveStatus[company.id] = company.account_status as CompanyAccountStatusValue | null
      }
      continue
    }

    effectiveStatus[company.id] = computed

    if (computed !== company.account_status) {
      await supabase
        .from('companies')
        .update({
          account_status: computed,
          account_status_source: 'crm',
        } as { account_status: string | null; account_status_source: string })
        .eq('id', company.id)
    }
  }

  return effectiveStatus
}
