import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadResolvedDealDeadlines } from '@/lib/deals/load-resolved-deal-deadlines'
import { EMPTY_RESOLVED_DEADLINE } from '@/lib/deals/resolve-deal-deadline'
import type { AccountDealRow } from './account-action-types'

export async function getActiveDealsByCompanyIdImpl(
  companyId: string,
): Promise<AccountDealRow[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const { data } = await supabase
    .from('deals')
    .select('id, title, volume, status, expiry_date, tender_id, created_at, updated_at')
    .eq('organization_id', orgId)
    .eq('company_id', companyId)
    .not('status', 'in', '("won","lost")')
    .order('updated_at', { ascending: false, nullsFirst: false })
  const deals = data ?? []
  const deadlineByDeal = await loadResolvedDealDeadlines(supabase, {
    organizationId: orgId,
    deals: deals.map((row) => ({
      id: row.id,
      tender_id: row.tender_id ?? null,
      expiry_date: row.expiry_date ?? null,
    })),
  })
  return deals.map((row) => ({
    id: row.id,
    title: row.title,
    volume: row.volume,
    status: row.status,
    expiry_date: row.expiry_date,
    deadline: deadlineByDeal.get(row.id) ?? EMPTY_RESOLVED_DEADLINE,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at,
  }))
}
