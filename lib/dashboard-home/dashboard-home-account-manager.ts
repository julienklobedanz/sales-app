import type { SupabaseClient } from '@supabase/supabase-js'
import { getPendingClientApprovalsImpl } from '@/lib/evidence/pending-approvals'
import type { AccountManagerDashboardModel, UsageTotalsRow, WeeklyTrendStrip } from '@/lib/dashboard-home/dashboard-home-types'
import { countReferencesInWindow, loadReferenceKpis } from '@/lib/dashboard-home/dashboard-home-queries'
import { dashboardFirstName } from '@/lib/dashboard-home/dashboard-home-pure'

export async function loadAccountManagerDashboardData(
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null
): Promise<AccountManagerDashboardModel> {
  const greetingName = dashboardFirstName(fullName) || 'du'
  const kpis = await loadReferenceKpis(supabase)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  const prevWeekStart = new Date(now)
  prevWeekStart.setDate(prevWeekStart.getDate() - 14)

  const [
    totalThisWeek,
    totalPrevWeek,
    approvedThisWeek,
    approvedPrevWeek,
    internalThisWeek,
    internalPrevWeek,
    draftThisWeek,
    draftPrevWeek,
  ] = await Promise.all([
    countReferencesInWindow(supabase, weekStart.toISOString(), now.toISOString()),
    countReferencesInWindow(supabase, prevWeekStart.toISOString(), weekStart.toISOString()),
    countReferencesInWindow(supabase, weekStart.toISOString(), now.toISOString(), 'approved'),
    countReferencesInWindow(supabase, prevWeekStart.toISOString(), weekStart.toISOString(), 'approved'),
    countReferencesInWindow(supabase, weekStart.toISOString(), now.toISOString(), 'internal_only'),
    countReferencesInWindow(supabase, prevWeekStart.toISOString(), weekStart.toISOString(), 'internal_only'),
    countReferencesInWindow(supabase, weekStart.toISOString(), now.toISOString(), 'draft'),
    countReferencesInWindow(supabase, prevWeekStart.toISOString(), weekStart.toISOString(), 'draft'),
  ])
  const kpiTrends: WeeklyTrendStrip = {
    total: totalThisWeek - totalPrevWeek,
    approved: approvedThisWeek - approvedPrevWeek,
    internal: internalThisWeek - internalPrevWeek,
    draft: draftThisWeek - draftPrevWeek,
  }

  const pendingApprovals = await getPendingClientApprovalsImpl()
  const pendingApprovalsCount = pendingApprovals.length

  const usageWindowDays = 30
  const since = new Date()
  since.setDate(since.getDate() - usageWindowDays)

  const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', userId).single()
  const orgId = prof?.organization_id as string | undefined

  let usageTotals: UsageTotalsRow = { views: 0, shares: 0, matches: 0 }
  const usageByReference: AccountManagerDashboardModel['usageByReference'] = []
  if (orgId) {
    const { count: views } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_viewed')
      .gte('created_at', since.toISOString())

    const { count: shareA } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_shared')
      .gte('created_at', since.toISOString())

    const { count: shareB } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'share_link_viewed')
      .gte('created_at', since.toISOString())

    const { count: matches } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_matched')
      .gte('created_at', since.toISOString())

    usageTotals = {
      views: views ?? 0,
      shares: (shareA ?? 0) + (shareB ?? 0),
      matches: matches ?? 0,
    }

    // Minimal-Variante: „eigene“ Referenzen (created_by=userId) + Zählungen pro reference_id in evidence_events.
    const { data: myRefs } = await supabase
      .from('references')
      .select('id, title')
      .eq('organization_id', orgId)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(30)

    const refIds = (myRefs ?? []).map((r) => r.id as string)
    if (refIds.length > 0) {
      const { data: ev } = await supabase
        .from('evidence_events')
        .select('reference_id, event_type')
        .eq('organization_id', orgId)
        .in('reference_id', refIds)
        .gte('created_at', since.toISOString())
        .limit(8000)

      const agg = new Map<string, { views: number; shares: number; matches: number }>()
      for (const id of refIds) agg.set(id, { views: 0, shares: 0, matches: 0 })
      for (const row of (ev ?? []) as Array<{ reference_id: string | null; event_type: string | null }>) {
        const rid = row.reference_id
        if (!rid || !agg.has(rid)) continue
        const a = agg.get(rid)!
        const et = String(row.event_type ?? '')
        if (et === 'reference_viewed') a.views += 1
        if (et === 'reference_shared' || et === 'share_link_viewed') a.shares += 1
        if (et === 'reference_matched') a.matches += 1
      }

      for (const r of (myRefs ?? []) as Array<{ id: string; title: string | null }>) {
        const a = agg.get(r.id) ?? { views: 0, shares: 0, matches: 0 }
        usageByReference.push({
          id: r.id,
          title: r.title ?? '—',
          views: a.views,
          shares: a.shares,
          matches: a.matches,
        })
      }
      usageByReference.sort((a, b) => b.views + b.shares + b.matches - (a.views + a.shares + a.matches))
      usageByReference.splice(12)
    }
  }

  return {
    greetingName,
    kpis,
    kpiTrends,
    pendingApprovalsCount,
    pendingApprovals,
    usageWindowDays,
    usageTotals,
    usageByReference,
  }
}
