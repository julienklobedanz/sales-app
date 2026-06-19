import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReferenceKpiCounts } from '@/lib/dashboard-home/dashboard-home-types'

export async function loadReferenceKpis(supabase: SupabaseClient): Promise<ReferenceKpiCounts> {
  const totalQ = () =>
    supabase.from('references').select('id', { count: 'exact', head: true }).is('deleted_at', null)

  const [{ count: total }, { count: draft }, { count: internal_only }, { count: approved }] = await Promise.all([
    totalQ(),
    supabase.from('references').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'draft'),
    supabase.from('references').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'internal_only'),
    supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .in('status', ['approved', 'external']),
  ])

  return {
    total: total ?? 0,
    approved: approved ?? 0,
    internal: internal_only ?? 0,
    draft: draft ?? 0,
  }
}

export async function countReferencesInWindow(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
  status?: 'draft' | 'internal_only' | 'approved'
) {
  let q = supabase
    .from('references')
    .select('id', { count: 'exact', head: true })
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
