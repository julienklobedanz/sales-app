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
  company_logo_url?: string | null
  volume: string | null
  expiry_date: string | null
  linkedCount: number
  bestMatchScore: number | null
  quickShareReferenceId: string | null
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

export type WeeklyTrendStrip = {
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
  kpiTrends: WeeklyTrendStrip
  pendingApprovalsCount: number
  pendingApprovals: Awaited<ReturnType<typeof getPendingClientApprovalsImpl>>
  usageWindowDays: number
  usageTotals: UsageTotalsRow
  usageByReference: Array<{
    id: string
    title: string
    views: number
    shares: number
    matches: number
  }>
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
  companyName: string
  companyLogoUrl: string | null
  updatedAt: string | null
  eventCount: number
}

export type TeamActivityRow = {
  id: string
  userId: string
  displayName: string
  actionLabel: string
  timestamp: string
  companyName: string | null
  companyLogoUrl: string | null
}

export type AdminDashboardModel = {
  greetingName: string
  kpis: AdminKpiStrip
  kpiTrends: {
    referencesTotal: number
    matches7d: number
    shares7d: number
    wau7d: number
  }
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

async function countReferencesInWindow(
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
      company_logo_url: d.company_logo_url ?? null,
      volume: d.volume ?? null,
      expiry_date: d.expiry_date,
      linkedCount: d.linked_refs?.length ?? 0,
      bestMatchScore: d.best_match_score ?? null,
      quickShareReferenceId: d.linked_refs?.[0]?.id ?? null,
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
  userId: string,
  fullName: string | null
): Promise<AccountManagerDashboardModel> {
  const greetingName = firstName(fullName) || 'du'
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

export async function loadAdminDashboardData(
  supabase: SupabaseClient,
  fullName: string | null
): Promise<AdminDashboardModel> {
  const greetingName = firstName(fullName) || 'du'

  const kpisBase = await loadReferenceKpis(supabase)
  const referencesTotal = kpisBase.total

  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)
  const prevSince7 = new Date()
  prevSince7.setDate(prevSince7.getDate() - 14)

  const { data: profile } = await supabase.auth.getUser()
  const uid = profile.user?.id
  const { data: prof } = uid
    ? await supabase.from('profiles').select('organization_id').eq('id', uid).single()
    : { data: null }
  const orgId = prof?.organization_id as string | undefined

  let matches7d = 0
  let shares7d = 0
  let wau7d = 0
  let referencesCreated7d = 0
  let prevReferencesCreated7d = 0
  let prevMatches7d = 0
  let prevShares7d = 0
  let prevWau7d = 0
  const topReferences: TopReferenceRow[] = []
  const teamActivity: TeamActivityRow[] = []

  if (orgId) {
    const { count: refCurrent } = await supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .gte('created_at', since7.toISOString())
    referencesCreated7d = refCurrent ?? 0

    const { count: refPrev } = await supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .gte('created_at', prevSince7.toISOString())
      .lt('created_at', since7.toISOString())
    prevReferencesCreated7d = refPrev ?? 0

    const { count: m } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_matched')
      .gte('created_at', since7.toISOString())
    matches7d = m ?? 0
    const { count: mPrev } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_matched')
      .gte('created_at', prevSince7.toISOString())
      .lt('created_at', since7.toISOString())
    prevMatches7d = mPrev ?? 0

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
    const { count: ps1 } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_shared')
      .gte('created_at', prevSince7.toISOString())
      .lt('created_at', since7.toISOString())
    const { count: ps2 } = await supabase
      .from('evidence_events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('event_type', 'share_link_viewed')
      .gte('created_at', prevSince7.toISOString())
      .lt('created_at', since7.toISOString())
    prevShares7d = (ps1 ?? 0) + (ps2 ?? 0)

    const { data: distinctUsers } = await supabase
      .from('evidence_events')
      .select('created_by')
      .eq('organization_id', orgId)
      .gte('created_at', since7.toISOString())
      .not('created_by', 'is', null)
    const u = new Set((distinctUsers ?? []).map((r) => r.created_by as string))
    wau7d = u.size
    const { data: prevDistinctUsers } = await supabase
      .from('evidence_events')
      .select('created_by')
      .eq('organization_id', orgId)
      .gte('created_at', prevSince7.toISOString())
      .lt('created_at', since7.toISOString())
      .not('created_by', 'is', null)
    prevWau7d = new Set((prevDistinctUsers ?? []).map((r) => r.created_by as string)).size

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
      const { data: refs } = await supabase
        .from('references')
        .select('id, title, updated_at, companies(name, logo_url)')
        .in('id', refIds)
      const refById = new Map(
        (refs ?? []).map((r) => {
          const company = Array.isArray(r.companies)
            ? (r.companies[0] as { name?: string; logo_url?: string | null } | undefined)
            : (r.companies as { name?: string; logo_url?: string | null } | null)
          return [
            r.id as string,
            {
              title: (r.title as string) ?? '—',
              updatedAt: (r.updated_at as string | null) ?? null,
              companyName: company?.name ?? '—',
              companyLogoUrl: company?.logo_url ?? null,
            },
          ]
        })
      )
      for (const [id, n] of sorted) {
        const ref = refById.get(id)
        topReferences.push({
          id,
          title: ref?.title ?? '—',
          updatedAt: ref?.updatedAt ?? null,
          companyName: ref?.companyName ?? '—',
          companyLogoUrl: ref?.companyLogoUrl ?? null,
          eventCount: n,
        })
      }
    }

    const { data: teamRows } = await supabase
      .from('evidence_events')
      .select('id, created_by, created_at, event_type, reference_id')
      .eq('organization_id', orgId)
      .gte('created_at', since7.toISOString())
      .not('created_by', 'is', null)
      .order('created_at', { ascending: false })
      .limit(80)

    const refIdsForTeam = [...new Set((teamRows ?? []).map((r) => r.reference_id).filter(Boolean) as string[])]
    const { data: teamRefs } = refIdsForTeam.length
      ? await supabase
          .from('references')
          .select('id, companies(name, logo_url)')
          .in('id', refIdsForTeam)
      : { data: [] as Array<Record<string, unknown>> }
    const companyByReferenceId = new Map(
      (teamRefs ?? []).map((row) => {
        const company = Array.isArray(row.companies)
          ? (row.companies[0] as { name?: string; logo_url?: string | null } | undefined)
          : (row.companies as { name?: string; logo_url?: string | null } | null)
        return [
          row.id as string,
          {
            name: company?.name ?? null,
            logo: company?.logo_url ?? null,
          },
        ]
      })
    )

    const userIds = [...new Set((teamRows ?? []).map((r) => r.created_by as string).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: names } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      const nameById = new Map((names ?? []).map((p) => [p.id as string, (p.full_name as string) ?? p.id.slice(0, 8)]))
      for (const row of (teamRows ?? []) as Array<Record<string, unknown>>) {
        const userId = row.created_by as string
        const eventType = String(row.event_type ?? '')
        const referenceId = (row.reference_id as string | null) ?? null
        const company = referenceId ? companyByReferenceId.get(referenceId) : null
        const actionLabel =
          eventType === 'share_link_viewed' || eventType === 'reference_shared'
            ? 'hat einen Share-Link erstellt'
            : eventType === 'reference_matched'
              ? 'hat ein Match erzeugt'
              : 'hat ein Event ausgelöst'
        teamActivity.push({
          id: String(row.id),
          userId,
          displayName: nameById.get(userId) ?? userId.slice(0, 8),
          actionLabel,
          timestamp: String(row.created_at ?? ''),
          companyName: company?.name ?? null,
          companyLogoUrl: company?.logo ?? null,
        })
      }
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
    kpiTrends: {
      referencesTotal: referencesCreated7d - prevReferencesCreated7d,
      matches7d: matches7d - prevMatches7d,
      shares7d: shares7d - prevShares7d,
      wau7d: wau7d - prevWau7d,
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
    return { role: 'account_manager', data: await loadAccountManagerDashboardData(supabase, userId, fullName) }
  }
  return { role: 'admin', data: await loadAdminDashboardData(supabase, fullName) }
}
