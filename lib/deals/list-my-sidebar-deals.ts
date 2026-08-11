import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { ACTIVE_DEAL_STATUSES } from '@/lib/dashboard-home/dashboard-home-types'
import { ROUTES } from '@/lib/routes'

export type SidebarDealNavItem = {
  id: string
  title: string
  companyName: string | null
  href: string
}

const SIDEBAR_DEAL_LIMIT = 10

/** Aktive Deals, bei denen der User Sales Manager oder Account Manager ist — für Sidebar Quick Access. */
export async function listMySidebarDeals(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<SidebarDealNavItem[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, expiry_date, status, companies(name)')
    .eq('organization_id', orgId)
    .or(`sales_manager_id.eq.${userId},account_manager_id.eq.${userId}`)
    .in('status', ACTIVE_DEAL_STATUSES)
    .order('expiry_date', { ascending: true })
    .limit(SIDEBAR_DEAL_LIMIT)

  if (error || !data?.length) return []

  return data.map((row) => {
    const company = Array.isArray(row.companies)
      ? (row.companies[0] as { name?: string | null } | undefined)
      : (row.companies as { name?: string | null } | null)
    return {
      id: String(row.id),
      title: String(row.title ?? 'Deal').trim() || 'Deal',
      companyName: company?.name?.trim() || null,
      href: ROUTES.deals.detail(String(row.id)),
    }
  })
}
