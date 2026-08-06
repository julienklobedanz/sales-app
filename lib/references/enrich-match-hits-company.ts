import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { accountFromJoin } from '@/lib/accounts/account-from-join'

export type MatchHitCompanyFields = {
  companyId: string | null
  companyName: string | null
  companyLogoUrl: string | null
}

/** Lädt Account-Logo und -Name für Match-/Such-Treffer nach. */
export async function fetchCompanyFieldsForReferenceIds(
  supabase: SupabaseClient,
  referenceIds: string[],
): Promise<Map<string, MatchHitCompanyFields>> {
  const map = new Map<string, MatchHitCompanyFields>()
  if (!referenceIds.length) return map

  const { data, error } = await supabase
    .from('references')
    .select('id, company_id, companies ( id, name, logo_url )')
    .in('id', referenceIds)

  if (error) return map

  for (const row of data ?? []) {
    const co = accountFromJoin(row.companies)
    map.set(String(row.id), {
      companyId: co?.id ?? (row.company_id ? String(row.company_id) : null),
      companyName: co?.name || null,
      companyLogoUrl: co?.logoUrl ?? null,
    })
  }

  return map
}
