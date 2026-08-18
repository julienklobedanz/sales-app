import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AccountDealRow, DealSignalRow } from './account-action-types'

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

export async function getExpiringDealsByCompanyIdImpl(
  companyId: string,
): Promise<DealSignalRow[]> {
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
  const now = new Date()
  const in180 = new Date(now)
  in180.setDate(in180.getDate() + 180)
  const { data } = await supabase
    .from('deals')
    .select('id, title, expiry_date, volume, incumbent_provider, status')
    .eq('company_id', companyId)
    .eq('organization_id', orgId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', in180.toISOString().slice(0, 10))
    .order('expiry_date', { ascending: true })
  return (data ?? []) as DealSignalRow[]
}
