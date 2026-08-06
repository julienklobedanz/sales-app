import type { SupabaseClient } from '@supabase/supabase-js'

import {
  companyNameSearchToken,
  companyNamesEquivalent,
} from '@/lib/accounts/account-name-match'
import type { CrmProvider } from '@/lib/crm/types'

function normalizeDomain(raw: string | null | undefined): string | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
  return value.includes('.') ? value : null
}

export type ExistingCompanyMatch = {
  id: string
  name: string
  matchReason: 'crm_id' | 'name' | 'domain'
}

export async function findExistingCompanyForCrmImport(
  supabase: SupabaseClient,
  organizationId: string,
  params: {
    provider: CrmProvider
    externalAccountId: string
    name: string
    website?: string | null
  },
): Promise<ExistingCompanyMatch | null> {
  const { data: byCrmId } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('entity_kind', 'account')
    .eq('crm_provider', params.provider)
    .eq('crm_account_id', params.externalAccountId)
    .maybeSingle()

  if (byCrmId?.id) {
    return {
      id: byCrmId.id,
      name: String(byCrmId.name ?? params.name),
      matchReason: 'crm_id',
    }
  }

  const domain = normalizeDomain(params.website)
  if (domain) {
    const { data: byDomain } = await supabase
      .from('companies')
      .select('id, name, website_url')
      .eq('organization_id', organizationId)
      .eq('entity_kind', 'account')
      .ilike('website_url', `%${domain}%`)
      .limit(1)
      .maybeSingle()

    if (byDomain?.id) {
      return {
        id: byDomain.id,
        name: String(byDomain.name ?? params.name),
        matchReason: 'domain',
      }
    }
  }

  const token = companyNameSearchToken(params.name)
  if (!token) return null

  const { data: candidates } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('entity_kind', 'account')
    .ilike('name', `%${token}%`)
    .limit(20)

  for (const row of candidates ?? []) {
    if (companyNamesEquivalent(String(row.name ?? ''), params.name)) {
      return {
        id: row.id,
        name: String(row.name ?? params.name),
        matchReason: 'name',
      }
    }
  }

  return null
}
