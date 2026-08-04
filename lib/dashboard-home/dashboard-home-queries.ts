import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReferenceKpiCounts } from '@/lib/dashboard-home/dashboard-home-types'
import { loadReferenceKpisForOrg } from '@/lib/cache/cached-org-reads'

export async function loadReferenceKpis(
  supabase: SupabaseClient,
  orgId: string,
): Promise<ReferenceKpiCounts> {
  return loadReferenceKpisForOrg(supabase, orgId)
}

export async function countReferencesInWindow(
  supabase: SupabaseClient,
  orgId: string,
  fromIso: string,
  toIso: string,
  status?: 'draft' | 'internal_only' | 'approved',
) {
  let q = supabase
    .from('references')
    .select('id', { count: 'planned', head: true }) // KPI-Trend, ±1 akzeptabel
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
  if (status === 'approved') {
    q = q.in('status', ['approved', 'external'])
  } else if (status) {
    q = q.eq('status', status)
  }
  const { count } = await q
  return count ?? 0
}
