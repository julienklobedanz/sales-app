import type { SupabaseClient } from '@supabase/supabase-js'

import { getDeals } from '@/app/dashboard/deals/actions'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { hasCapability } from '@/lib/roles/legacy-mapping'

export type InsightsScope = 'all' | 'own'

export type InsightsPageModel = {
  scope: InsightsScope
  windowDays: number
  usage: { views: number; shares: number; matches: number }
  adoption: { wau: number; teamSize: number }
  winRate: {
    withReference: { won: number; total: number; rate: number | null }
    withoutReference: { won: number; total: number; rate: number | null }
    meaningful: boolean
    minDealsRequired: number
  }
  topReferences: Array<{ id: string; title: string; eventCount: number }>
  coverageGaps: Array<{ term: string; searches: number }>
}

export function resolveInsightsScope(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  capabilityOverrides: Partial<Record<string, boolean>> = {},
): InsightsScope | null {
  if (
    hasCapability(functionRole, systemRole, capabilityOverrides, 'view_analytics_all')
  ) {
    return 'all'
  }
  if (
    hasCapability(functionRole, systemRole, capabilityOverrides, 'view_analytics_own')
  ) {
    return 'own'
  }
  return null
}

async function countEvents(
  supabase: SupabaseClient,
  orgId: string,
  sinceIso: string,
  eventType: string | string[],
  ownRefIds: string[] | null,
): Promise<number> {
  if (ownRefIds && ownRefIds.length === 0) return 0
  let query = supabase
    .from('evidence_events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', sinceIso)
  if (Array.isArray(eventType)) {
    query = query.in('event_type', eventType)
  } else {
    query = query.eq('event_type', eventType)
  }
  if (ownRefIds) query = query.in('reference_id', ownRefIds)
  const { count } = await query
  return count ?? 0
}

export async function loadInsightsPageData(
  supabase: SupabaseClient,
  userId: string,
  scope: InsightsScope,
): Promise<InsightsPageModel> {
  const windowDays = 30
  const since = new Date()
  since.setDate(since.getDate() - windowDays)
  const sinceIso = since.toISOString()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  const orgId = profile?.organization_id as string | undefined

  let usage = { views: 0, shares: 0, matches: 0 }
  const adoption = { wau: 0, teamSize: 0 }
  const topReferences: InsightsPageModel['topReferences'] = []
  const coverageGaps: InsightsPageModel['coverageGaps'] = []

  if (orgId) {
    const ownOnly = scope === 'own'
    let ownRefIds: string[] | null = null
    if (ownOnly) {
      const { data: myRefs } = await supabase
        .from('references')
        .select('id')
        .eq('organization_id', orgId)
        .eq('created_by', userId)
        .is('deleted_at', null)
      ownRefIds = (myRefs ?? []).map((r) => String(r.id))
    }

    const [views, sharesA, sharesB, matches, teamRes, wauRes] = await Promise.all([
      countEvents(supabase, orgId, sinceIso, 'reference_viewed', ownRefIds),
      countEvents(supabase, orgId, sinceIso, 'reference_shared', ownRefIds),
      countEvents(supabase, orgId, sinceIso, 'share_link_viewed', ownRefIds),
      countEvents(supabase, orgId, sinceIso, 'reference_matched', ownRefIds),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('evidence_events')
        .select('created_by')
        .eq('organization_id', orgId)
        .gte('created_at', sinceIso),
    ])

    usage = {
      views,
      shares: sharesA + sharesB,
      matches,
    }
    adoption.teamSize = teamRes.count ?? 0
    const wauSet = new Set(
      (wauRes.data ?? [])
        .map((r) => String((r as { created_by?: string }).created_by ?? ''))
        .filter(Boolean),
    )
    adoption.wau = wauSet.size

    const { data: refEvents } = await supabase
      .from('evidence_events')
      .select('reference_id, references(id, title)')
      .eq('organization_id', orgId)
      .gte('created_at', sinceIso)
      .not('reference_id', 'is', null)
      .limit(500)

    const counts = new Map<string, { id: string; title: string; count: number }>()
    for (const row of refEvents ?? []) {
      const ref = (
        row as {
          references?:
            | { id: string; title: string }
            | { id: string; title: string }[]
            | null
        }
      ).references
      const refRow = Array.isArray(ref) ? ref[0] : ref
      if (!refRow?.id) continue
      if (ownRefIds && !ownRefIds.includes(refRow.id)) continue
      const cur = counts.get(refRow.id) ?? {
        id: refRow.id,
        title: refRow.title ?? 'Referenz',
        count: 0,
      }
      cur.count += 1
      counts.set(refRow.id, cur)
    }
    topReferences.push(
      ...Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((r) => ({ id: r.id, title: r.title, eventCount: r.count })),
    )

    const { data: zeroRows } = await supabase
      .from('audit_logs')
      .select('action_details')
      .eq('org_id', orgId)
      .eq('action', 'search_zero_results')
      .gte('timestamp', sinceIso)
      .limit(50)
    for (const row of zeroRows ?? []) {
      const details = (row as { action_details?: { query?: string } | null })
        .action_details
      const term = String(details?.query ?? '').trim()
      if (!term) continue
      const existing = coverageGaps.find((g) => g.term === term)
      if (existing) existing.searches += 1
      else coverageGaps.push({ term, searches: 1 })
    }
    coverageGaps.sort((a, b) => b.searches - a.searches)
  }

  const allDeals = await getDeals()
  const closed = allDeals.filter((d) => d.status === 'won' || d.status === 'lost')
  const withRef = closed.filter((d) => (d.linked_refs?.length ?? 0) > 0)
  const withoutRef = closed.filter((d) => (d.linked_refs?.length ?? 0) === 0)
  const minDealsRequired = 5
  const wonWith = withRef.filter((d) => d.status === 'won').length
  const wonWithout = withoutRef.filter((d) => d.status === 'won').length
  const meaningful = closed.length >= minDealsRequired

  return {
    scope,
    windowDays,
    usage,
    adoption,
    winRate: {
      withReference: {
        won: wonWith,
        total: withRef.length,
        rate: withRef.length > 0 ? Math.round((wonWith / withRef.length) * 100) : null,
      },
      withoutReference: {
        won: wonWithout,
        total: withoutRef.length,
        rate:
          withoutRef.length > 0
            ? Math.round((wonWithout / withoutRef.length) * 100)
            : null,
      },
      meaningful,
      minDealsRequired,
    },
    topReferences,
    coverageGaps: coverageGaps.slice(0, 5),
  }
}
