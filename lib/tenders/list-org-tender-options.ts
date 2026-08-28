import 'server-only'

import { accountFromJoin } from '@/lib/accounts/account-from-join'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile } from '@/lib/auth/request-user'
import type { OrgTenderOption } from './org-tender-option'

export async function listOrgTenderOptions(): Promise<OrgTenderOption[]> {
  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const supabase = await createServerSupabaseClient()
  const { data: tenders, error } = await supabase
    .from('tenders')
    .select('id, title, companies ( name )')
    .eq('organization_id', orgId)
    .order('title', { ascending: true })

  if (error || !tenders) return []

  const ids = tenders.map((row) => row.id)
  const lotCounts = new Map<string, number>()
  if (ids.length > 0) {
    const { data: lots } = await supabase
      .from('deals')
      .select('tender_id')
      .eq('organization_id', orgId)
      .in('tender_id', ids)
    for (const lot of lots ?? []) {
      if (!lot.tender_id) continue
      lotCounts.set(lot.tender_id, (lotCounts.get(lot.tender_id) ?? 0) + 1)
    }
  }

  return tenders.map((row) => ({
    id: row.id,
    title: row.title,
    company_name: accountFromJoin(row.companies)?.name ?? null,
    lotCount: lotCounts.get(row.id) ?? 0,
  }))
}
