import { createServerSupabaseClient } from '@/lib/supabase/server'
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
    .select('id, title, volume, status, expiry_date, created_at, updated_at')
    .eq('organization_id', orgId)
    .eq('company_id', companyId)
    .not('status', 'in', '("won","lost")')
    .order('updated_at', { ascending: false, nullsFirst: false })
  return (data ?? []) as AccountDealRow[]
}
