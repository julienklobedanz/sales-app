import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRole } from '@/hooks/useRole'
import { matchReferences } from '@/app/dashboard/actions'
import { getDeals } from '@/app/dashboard/deals/actions'
import type { DealRow, DealStatus } from '@/app/dashboard/deals/types'
import { getPendingClientApprovalsImpl } from '@/app/dashboard/references/pending-approvals'
import { getRequestsImpl } from '@/app/dashboard/references/approval-requests'

const ACTIVE_DEAL_STATUSES: DealStatus[] = ['open', 'rfp', 'negotiation']

export type SalesRepDealCard = {
  id: string
  title: string
  status: DealStatus
  company_name: string | null
  expiry_date: string | null
  linkedCount: number
  bestMatchScore: number | null
}

export type RecommendedRefRow = {
  id: string
  title: string
  snippet: string
  similarity: number
}

export type RecentShareRow = {
  created_at: string
  slug: string | null
}

export type SalesRepDashboardModel = {
  greetingName: string
  activeDeals: SalesRepDealCard[]
  recommended: RecommendedRefRow[]
  recommendedNote: string | null
  recentShares: RecentShareRow[]
}

export type ReferenceKpiCounts = {
  total: number
  approved: number
  internal: number
  draft: number
}

export type UsageTotalsRow = {
  views: number
  shares: number
  matches: number
}

export type AccountManagerDashboardModel = {
  greetingName: string
  kpis: ReferenceKpiCounts
  pendingApprovalsCount: number
  pendingApprovals: Awaited<ReturnType<typeof getPendingClientApprovalsImpl>>
  usageWindowDays: number
  usageTotals: UsageTotalsRow
}

export type AdminKpiStrip = {
  referencesTotal: number
  matches7d: number
  shares7d: number
  wau7d: number
}

export type TopReferenceRow = {
  id: string
  title: string
  eventCount: number
}

export type TeamActivityRow = {
  userId: string
  displayName: string
  matches: number
  shares: number
}

export type AdminDashboardModel = {
  greetingName: string
  kpis: AdminKpiStrip
  topReferences: TopReferenceRow[]
  openRequests: Awaited<ReturnType<typeof getRequestsImpl>>
  teamActivity: TeamActivityRow[]
}

function firstName(fullName: string | null | undefined): string {
  const s = fullName?.trim()
  if (!s) return ''
  return s.split(/\s+/)[0] ?? ''
}

async function loadReferenceKpis(supabase: SupabaseClient): Promise<ReferenceKpiCounts> {
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

export async function loadSalesRepDashboardData(
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null
): Promise<SalesRepDashboardModel> {
  const greetingName = firstName(fullName) || 'du'

  const allDeals = await getDeals()
  const activeDeals: SalesRepDealCard[] = allDeals
    .filter(
      (d) =>
        d.sales_manager_id === userId &&
        ACTIVE_DEAL_STATUSES.includes(d.status)
    )
    .map((d: DealRow) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      company_name: d.company_name,
      expiry_date: d.expiry_date,
      linkedCount: d.linked_refs?.length ?? 0,
      bestMatchScore: d.best_match_score ?? null,
    }))
    .slice(0, 8)

  let recommended: RecommendedRefRow[] = []
  let recommendedNote: string | null = null

  const primary = activeDeals[0]
  if (primary) {
    const full = allDeals.find((x) => x.id === primary.id)
    const req = (full?.requirements_text ?? '').trim()
    const query =
      [full?.title, full?.industry, full?.volume, req].filter(Boolean).join('\n').slice(0, 3500) || full?.title || ''

    if (query.trim()) {
      const result = await matchReferences(query, primary.id, { matchCount: 6, matchThreshold: 0.65 })
      if (result.success) {
        recommended = result.matches.map((m) => ({
          id: m.id,
          title: m.title,
          snippet: m.snippet,
          similarity: m.similarity,
        }))
      } else {
        recommendedNote = result.error
      }
    }
  } else {
    recommendedNote = 'Keine aktiven Deals – keine automatischen Empfehlungen.'
  }

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).single()
  const orgId = profile?.organization_id as string | undefined
  let recentShares: RecentShareRow[] = []
  if (orgId) {
    const { data: ev } = await supabase
      .from('evidence_events')
      .select('created_at, payload')
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_shared')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    recentShares = (ev ?? []).map((row) => {
      const payload = row.payload as { slug?: string } | null
      return {
        created_at: row.created_at as string,
        slug: payload?.slug ?? null,
      }
    })
  }

  return {
    greetingName,
    activeDeals,
    recommended,
    recommendedNote,
    recentShares,
  }
}

export async function loadAccountManagerDashboardData(
  supabase: SupabaseClient,
  fullName: string | null
): Promise<AccountManagerDashboardModel> {
  const greetingName = firstName(fullName) || 'du'
  const kpis = await loadReferenceKpis(supabase)

  const pendingApprovals = await getPendingClientApprovalsImpl()
  const pendingApprovalsCount = pendingApprovals.length

  const usageWindowDays = 30
  const since = new Date()
  since.setDate(since.getDate() - usageWindowDays)

  const { data: profile } = await supabase.auth.getUser()
  const uid = profile.user?.id
  const { data: prof } = uid
    ? await supabase.from('profiles').select('organization_id').eq('id', uid).single()
    : { data: null }
  const orgId = prof?.organization_id as string | undefined

  let usageTotals: UsageTotalsRow = { views: 0, shares: 0, matches: 0 }
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
  }

  return {
    greetingName,
    kpis,
    pendingApprovalsCount,
    pendingApprovals,
    usageWindowDays,
    usageTotals,
  }
}

export async function loadAdminDashboardData(
  supabase: SupabaseClient,
  fullName: string | null
): Promise<AdminDashboardModel> {
  const greetingName = firstName(fullName) || 'du'

  const kpisBase = await loadReferenceKpis(supabase)
  const referencesTotal = kpisBase.total

  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)

  const { data: profile } = await supabase.auth.getUser()
  const uid = profile.user?.id
  const { data: prof } = uid
    ? await supabase.from('profiles').select('organization_id').eq('id', uid).single()
    : { data: null }
  const orgId = prof?.organization_id as string | undefined

  let matches7d = 0
  let shares7d = 0
  let wau7d = 0
  const topReferences: TopReferenceRow[] = []
  const teamActivity: TeamActivityRow[] = []

  if (orgId) {
    const { count: m } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_matched')
      .gte('created_at', since7.toISOString())
    matches7d = m ?? 0

    const { count: s1 } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_shared')
      .gte('created_at', since7.toISOString())
    const { count: s2 } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'share_link_viewed')
      .gte('created_at', since7.toISOString())
    shares7d = (s1 ?? 0) + (s2 ?? 0)

    const { data: distinctUsers } = await supabase
      .from('evidence_events')
      .select('created_by')
      .eq('organization_id', orgId)
      .gte('created_at', since7.toISOString())
      .not('created_by', 'is', null)
    const u = new Set((distinctUsers ?? []).map((r) => r.created_by as string))
    wau7d = u.size

    const { data: evRows } = await supabase
      .from('evidence_events')
      .select('reference_id')
      .eq('organization_id', orgId)
      .not('reference_id', 'is', null)
      .gte('created_at', since7.toISOString())
      .limit(6000)

    const counts = new Map<string, number>()
    for (const row of evRows ?? []) {
      const id = row.reference_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const refIds = sorted.map(([id]) => id)
    if (refIds.length > 0) {
      const { data: refs } = await supabase.from('references').select('id, title').in('id', refIds)
      const titleById = new Map((refs ?? []).map((r) => [r.id as string, (r.title as string) ?? '—']))
      for (const [id, n] of sorted) {
        topReferences.push({ id, title: titleById.get(id) ?? '—', eventCount: n })
      }
    }

    const { data: teamRows } = await supabase
      .from('evidence_events')
      .select('created_by, event_type')
      .eq('organization_id', orgId)
      .gte('created_at', since7.toISOString())
      .not('created_by', 'is', null)
      .limit(8000)

    const agg = new Map<string, { matches: number; shares: number }>()
    for (const row of teamRows ?? []) {
      const id = row.created_by as string
      if (!agg.has(id)) agg.set(id, { matches: 0, shares: 0 })
      const a = agg.get(id)!
      const et = row.event_type as string
      if (et === 'reference_matched') a.matches += 1
      if (et === 'reference_shared' || et === 'share_link_viewed') a.shares += 1
    }
    const userIds = [...agg.keys()]
    if (userIds.length > 0) {
      const { data: names } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      const nameById = new Map((names ?? []).map((p) => [p.id as string, (p.full_name as string) ?? p.id.slice(0, 8)]))
      for (const [userId, v] of agg) {
        teamActivity.push({
          userId,
          displayName: nameById.get(userId) ?? userId.slice(0, 8),
          matches: v.matches,
          shares: v.shares,
        })
      }
      teamActivity.sort((a, b) => b.matches + b.shares - (a.matches + a.shares))
      teamActivity.splice(12)
    }
  }

  const openRequests = (await getRequestsImpl()).filter((r) => r.status === 'pending')

  return {
    greetingName,
    kpis: {
      referencesTotal,
      matches7d,
      shares7d,
      wau7d,
    },
    topReferences,
    openRequests,
    teamActivity,
  }
}

export async function loadDashboardHomeForRole(
  role: AppRole,
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null
): Promise<
  | { role: 'sales'; data: SalesRepDashboardModel }
  | { role: 'account_manager'; data: AccountManagerDashboardModel }
  | { role: 'admin'; data: AdminDashboardModel }
> {
  if (role === 'sales') {
    return { role: 'sales', data: await loadSalesRepDashboardData(supabase, userId, fullName) }
  }
  if (role === 'account_manager') {
    return { role: 'account_manager', data: await loadAccountManagerDashboardData(supabase, fullName) }
  }
  return { role: 'admin', data: await loadAdminDashboardData(supabase, fullName) }
}
