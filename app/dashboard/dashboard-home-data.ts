import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRole } from '@/hooks/useRole'
import { matchReferences } from '@/app/dashboard/actions'
import { getDeals } from '@/app/dashboard/deals/actions'
import type { DealRow, DealStatus } from '@/app/dashboard/deals/types'
import { getPendingClientApprovalsImpl } from '@/app/dashboard/references/pending-approvals'
import { getRequestsImpl } from '@/app/dashboard/references/approval-requests'
import { ROUTES } from '@/lib/routes'

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
  account_name: string | null
  reference_title: string | null
  url: string | null
}

export type SalesRepDashboardModel = {
  greetingName: string
  activeDeals: SalesRepDealCard[]
  recommended: RecommendedRefRow[]
  recommendedNote: string | null
  recentShares: RecentShareRow[]
  snoozedSignalsCount: number
  dueSnoozesCount: number
  dailyTopActions: Array<{
    id: string
    level: 'prio' | 'new' | 'back'
    title: string
    subtitle: string
    ctaLabel: string
    href: string
    signalKey: string
    draftSubject: string
    draftBody: string
  }>
  liveIntent: Array<{
    id: string
    text: string
    createdAt: string
    href: string | null
  }>
  pipelineImpact: {
    outreachDone: number
    outreachTarget: number
    meetingsDone: number
    meetingsTarget: number
    opportunitiesDone: number
    opportunitiesTarget: number
    winRatePercent: number
    winRateDeltaPercent: number
  }
  strategicAccounts: Array<{
    companyId: string
    companyName: string
    signalSummary: string
    signalCount24h: number
    meddpiccGap: string
    actionLabel: string
    href: string
  }>
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
  blockers: Array<{
    id: string
    title: string
    detail: string
    ctaLabel: string
    href: string
    severity: 'high' | 'medium'
  }>
  contentRoi: {
    topStory: { title: string; impactLabel: string } | null
    gapAlert: { term: string; searches: number } | null
  }
  systemUsage: {
    activeUsers: number
    activeSeats: number
    dataFreshnessMinutes: number | null
    apiCreditUsedPercent: number | null
    apiHealth: 'stable' | 'warning' | 'critical'
    integrations: Array<{ name: string; status: 'healthy' | 'warning' | 'down' }>
  }
  newsIngestHealth: {
    lastRunAt: string | null
    mode: 'all_accounts' | 'focus_only' | 'unknown'
    scannedCompanies: number | null
    errors: number
  }
  auditFeed: Array<{
    id: string
    text: string
    timestamp: string
  }>
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
  let snoozedSignalsCount = 0
  let dueSnoozesCount = 0
  let dailyTopActions: SalesRepDashboardModel['dailyTopActions'] = []
  let liveIntent: SalesRepDashboardModel['liveIntent'] = []
  let strategicAccounts: SalesRepDashboardModel['strategicAccounts'] = []

  const pipelineImpact: SalesRepDashboardModel['pipelineImpact'] = {
    outreachDone: Math.min(activeDeals.length * 3, 42),
    outreachTarget: 50,
    meetingsDone: Math.min(Math.max(1, Math.round(activeDeals.length * 0.8)), 12),
    meetingsTarget: 12,
    opportunitiesDone: Math.min(Math.max(1, Math.round(activeDeals.length * 0.3)), 5),
    opportunitiesTarget: 5,
    winRatePercent: 14,
    winRateDeltaPercent: 2,
  }
  if (orgId) {
    const [signalReadRows, execRows, newsRows, intentRows] = await Promise.all([
      supabase
        .from('notification_inbox_reads')
        .select('notification_key,read_at')
        .eq('user_id', userId)
        .or(
          'notification_key.like.market_snooze_until:%,notification_key.like.market_priority:today:%'
        )
        .limit(1200),
      supabase
        .from('market_signal_executive_events')
        .select('id,person_name,change_summary,detected_at,company_id,companies(name)')
        .order('detected_at', { ascending: false })
        .limit(120),
      supabase
        .from('market_signal_account_news')
        .select('id,body,published_on,company_id,companies(name)')
        .order('published_on', { ascending: false })
        .limit(120),
      supabase
        .from('evidence_events')
        .select('id,event_type,created_at,payload,reference_id')
        .eq('organization_id', orgId)
        .in('event_type', ['share_link_viewed', 'reference_viewed', 'reference_shared'])
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const snoozeKeys = (signalReadRows.data ?? [])
      .map((row) => String((row as { notification_key?: string | null }).notification_key ?? ''))
      .filter((k) => k.startsWith('market_snooze_until:'))
    snoozedSignalsCount = snoozeKeys.length
    const nowMs = Date.now()
    dueSnoozesCount = snoozeKeys.filter((k) => {
      const parts = k.split(':')
      if (parts.length < 4) return false
      const until = new Date(parts[2] ?? '').getTime()
      return Number.isFinite(until) && until <= nowMs
    }).length

    const latestExec = (execRows.data ?? [])[0] as
      | { id?: string; person_name?: string | null; change_summary?: string | null; company_id?: string | null; companies?: { name?: string | null }[] | { name?: string | null } | null; detected_at?: string | null }
      | undefined
    const latestNews = (newsRows.data ?? [])[0] as
      | { id?: string; body?: string | null; company_id?: string | null; companies?: { name?: string | null }[] | { name?: string | null } | null; published_on?: string | null }
      | undefined

    const execCompany = Array.isArray(latestExec?.companies) ? latestExec?.companies[0] : latestExec?.companies
    const newsCompany = Array.isArray(latestNews?.companies) ? latestNews?.companies[0] : latestNews?.companies
    const execCompanyName = String(execCompany?.name ?? 'Account')
    const newsCompanyName = String(newsCompany?.name ?? 'Account')
    const execSignalKey = latestExec?.id ? `market_exec:${latestExec.id}` : `market_exec:dashboard:${orgId}`
    const newsSignalKey = latestNews?.id ? `market_news:${latestNews.id}` : `market_news:dashboard:${orgId}`

    dailyTopActions = [
      {
        id: 'top-prio',
        level: 'prio',
        title: `${execCompanyName} - Executive-Wechsel erkannt`,
        subtitle: String(latestExec?.change_summary ?? 'Neues High-Intent Signal erkannt.'),
        ctaLabel: 'Draft Outreach',
        href: ROUTES.marketSignals,
        signalKey: execSignalKey,
        draftSubject: `Re: ${execCompanyName} - kurzer Austausch zum Wechsel`,
        draftBody: `Hi [Name],\n\nich habe die aktuelle Veränderung bei ${execCompanyName} gesehen. Wenn du magst, schicke ich dir 2-3 kurze Benchmarks aus ähnlichen Situationen.\n\nBeste Grüße`,
      },
      {
        id: 'top-new',
        level: 'new',
        title: `${newsCompanyName} - Neues Firmen-Signal`,
        subtitle: String(latestNews?.body ?? 'Neues Markt-Update in der Watchlist.').slice(0, 120),
        ctaLabel: 'Referenz teilen',
        href: ROUTES.marketSignals,
        signalKey: newsSignalKey,
        draftSubject: `Relevante Referenz zu ${newsCompanyName}`,
        draftBody: `Hi [Name],\n\nzu eurem aktuellen Thema bei ${newsCompanyName} haben wir eine passende Referenz vorbereitet. Soll ich sie direkt schicken?\n\nViele Grüße`,
      },
      {
        id: 'top-back',
        level: 'back',
        title: `${dueSnoozesCount} Signale aus Snooze zurück`,
        subtitle: 'Wiedervorlage heute fällig - Queue jetzt priorisieren.',
        ctaLabel: 'Review Queue',
        href: ROUTES.marketSignals,
        signalKey: `market_news:snooze_due:${orgId}`,
        draftSubject: 'Follow-up auf fällige Signale',
        draftBody: `Hi Team,\n\nich gehe heute die fälligen Snoozes durch und priorisiere die Top-Chancen.\n\nVG`,
      },
    ]

    const intentEvents = (intentRows.data ?? []) as Array<{
      id?: string | null
      event_type?: string | null
      created_at?: string | null
      payload?: { slug?: string | null } | null
      reference_id?: string | null
    }>
    const intentRefIds = Array.from(new Set(intentEvents.map((e) => e.reference_id).filter(Boolean) as string[]))
    const { data: intentRefRows } = intentRefIds.length
      ? await supabase
          .from('references')
          .select('id,title,company_id,companies(name)')
          .in('id', intentRefIds)
      : { data: [] as Array<Record<string, unknown>> }
    const intentRefById = new Map(
      (intentRefRows ?? []).map((row) => {
        const company = Array.isArray(row.companies)
          ? (row.companies[0] as { name?: string | null } | undefined)
          : (row.companies as { name?: string | null } | null)
        return [
          String(row.id),
          {
            title: String((row as { title?: string | null }).title ?? 'Referenz'),
            companyName: String(company?.name ?? 'Account'),
            companyId: String((row as { company_id?: string | null }).company_id ?? ''),
          },
        ]
      })
    )
    liveIntent = intentEvents.slice(0, 6).map((e) => {
      const ref = e.reference_id ? intentRefById.get(e.reference_id) : null
      const eventType = String(e.event_type ?? '')
      const baseText =
        eventType === 'reference_viewed'
          ? `${ref?.companyName ?? 'Account'} liest ${ref?.title ?? 'eine Referenz'}`
          : eventType === 'share_link_viewed'
            ? `Kundenlink für ${ref?.companyName ?? 'Account'} wurde geöffnet`
            : `Link für ${ref?.companyName ?? 'Account'} wurde geteilt`
      return {
        id: String(e.id ?? crypto.randomUUID()),
        text: baseText,
        createdAt: String(e.created_at ?? new Date().toISOString()),
        href: ref?.companyId ? ROUTES.accountsDetail(ref.companyId) : null,
      }
    })

    const signalCountByCompany = new Map<string, { companyName: string; count: number; latestSummary: string }>()
    for (const row of (execRows.data ?? []) as Array<Record<string, unknown>>) {
      const companyId = String(row.company_id ?? '')
      if (!companyId) continue
      const company = Array.isArray(row.companies)
        ? (row.companies[0] as { name?: string | null } | undefined)
        : (row.companies as { name?: string | null } | null)
      const current = signalCountByCompany.get(companyId) ?? {
        companyName: String(company?.name ?? 'Account'),
        count: 0,
        latestSummary: String(row.change_summary ?? 'Executive Signal erkannt.'),
      }
      current.count += 1
      signalCountByCompany.set(companyId, current)
    }
    for (const row of (newsRows.data ?? []) as Array<Record<string, unknown>>) {
      const companyId = String(row.company_id ?? '')
      if (!companyId) continue
      const company = Array.isArray(row.companies)
        ? (row.companies[0] as { name?: string | null } | undefined)
        : (row.companies as { name?: string | null } | null)
      const current = signalCountByCompany.get(companyId) ?? {
        companyName: String(company?.name ?? 'Account'),
        count: 0,
        latestSummary: String(row.body ?? 'Company Update erkannt.'),
      }
      current.count += 1
      signalCountByCompany.set(companyId, current)
    }

    const strategicCompanyIds = Array.from(signalCountByCompany.keys()).slice(0, 12)
    const [stakeholderRows, strategyRows] = await Promise.all([
      strategicCompanyIds.length
        ? supabase
            .from('stakeholders')
            .select('company_id, role')
            .in('company_id', strategicCompanyIds)
            .limit(2000)
        : Promise.resolve({ data: [] as Array<{ company_id: string; role: string }> }),
      strategicCompanyIds.length
        ? supabase
            .from('company_strategies')
            .select('company_id, company_goals, next_steps')
            .in('company_id', strategicCompanyIds)
            .limit(2000)
        : Promise.resolve({ data: [] as Array<{ company_id: string; company_goals: string | null; next_steps: string | null }> }),
    ])

    const rolesByCompany = new Map<string, Set<string>>()
    for (const row of (stakeholderRows.data ?? []) as Array<{ company_id?: string | null; role?: string | null }>) {
      const companyId = String(row.company_id ?? '')
      if (!companyId) continue
      const set = rolesByCompany.get(companyId) ?? new Set<string>()
      if (row.role) set.add(String(row.role))
      rolesByCompany.set(companyId, set)
    }
    const strategyByCompany = new Map(
      (strategyRows.data ?? []).map((row) => [
        String((row as { company_id?: string | null }).company_id ?? ''),
        row as { company_goals?: string | null; next_steps?: string | null },
      ])
    )
    strategicAccounts = strategicCompanyIds
      .map((companyId) => {
        const signal = signalCountByCompany.get(companyId)
        if (!signal) return null
        const roles = rolesByCompany.get(companyId) ?? new Set<string>()
        const strategy = strategyByCompany.get(companyId)
        const hasChampion = roles.has('champion')
        const hasEconomic = roles.has('economic_buyer')
        const hasGoals = Boolean(String(strategy?.company_goals ?? '').trim())
        let meddpiccGap = 'MEDDPICC: vollständig'
        let actionLabel = 'View'
        if (!hasEconomic) {
          meddpiccGap = 'MEDDPICC: Economic Buyer fehlt'
          actionLabel = 'Fix'
        } else if (!hasChampion) {
          meddpiccGap = 'MEDDPICC: Champion fehlt'
          actionLabel = 'Fix'
        } else if (!hasGoals) {
          meddpiccGap = 'MEDDPICC: Metrics/Pain fehlt'
          actionLabel = 'Fix'
        } else {
          meddpiccGap = 'Story passt zum Signal'
          actionLabel = 'Send'
        }
        return {
          companyId,
          companyName: signal.companyName,
          signalSummary: signal.latestSummary.slice(0, 88),
          signalCount24h: signal.count,
          meddpiccGap,
          actionLabel,
          href: ROUTES.accountsDetail(companyId),
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => b.signalCount24h - a.signalCount24h)
      .slice(0, 6)

    const { data: ev } = await supabase
      .from('evidence_events')
      .select('created_at, payload')
      .eq('organization_id', orgId)
      .eq('event_type', 'reference_shared')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    const eventRows = (ev ?? []) as Array<{ created_at: string; payload: unknown }>
    const slugList = eventRows
      .map((row) => {
        const payload = (row.payload ?? null) as { slug?: string } | null
        return payload?.slug?.trim() || null
      })
      .filter((value): value is string => Boolean(value))

    const { data: sharedRows } = slugList.length
      ? await supabase
          .from('shared_portfolios')
          .select('slug, reference_ids')
          .in('slug', slugList)
      : { data: [] as Array<{ slug: string; reference_ids: string[] | null }> }

    const referenceIds = Array.from(
      new Set(
        (sharedRows ?? [])
          .flatMap((row) => (Array.isArray(row.reference_ids) ? row.reference_ids : []))
          .map((id) => String(id))
          .filter(Boolean)
      )
    )

    const { data: refRows } = referenceIds.length
      ? await supabase
          .from('references')
          .select('id, title, companies(name)')
          .in('id', referenceIds)
      : {
          data: [] as Array<{
            id: string
            title: string | null
            companies: { name?: string | null } | Array<{ name?: string | null }> | null
          }>,
        }

    const refMetaById = new Map<string, { title: string | null; accountName: string | null }>()
    for (const row of (refRows ?? []) as Array<{
      id: string
      title: string | null
      companies: { name?: string | null } | Array<{ name?: string | null }> | null
    }>) {
      const company = Array.isArray(row.companies)
        ? (row.companies[0] as { name?: string | null } | undefined)
        : (row.companies as { name?: string | null } | null)
      refMetaById.set(row.id, {
        title: row.title ?? null,
        accountName: company?.name ?? null,
      })
    }

    const shareBySlug = new Map<string, { firstReferenceId: string | null }>()
    for (const row of (sharedRows ?? []) as Array<{ slug: string; reference_ids: string[] | null }>) {
      const ids = Array.isArray(row.reference_ids) ? row.reference_ids.map((id) => String(id)) : []
      shareBySlug.set(String(row.slug), { firstReferenceId: ids[0] ?? null })
    }

    recentShares = eventRows.map((row) => {
      const payload = row.payload as { slug?: string; reference_ids?: string[] } | null
      const slug = payload?.slug?.trim() || null
      const firstRefIdFromPayload = Array.isArray(payload?.reference_ids)
        ? String(payload?.reference_ids?.[0] ?? '')
        : ''
      const firstRefId =
        firstRefIdFromPayload ||
        (slug ? (shareBySlug.get(slug)?.firstReferenceId ?? '') : '')
      const refMeta = firstRefId ? refMetaById.get(firstRefId) : null
      return {
        created_at: row.created_at as string,
        slug,
        account_name: refMeta?.accountName ?? null,
        reference_title: refMeta?.title ?? null,
        url: slug ? `/p/${slug}` : null,
      }
    })
  }

  return {
    greetingName,
    activeDeals,
    recommended,
    recommendedNote,
    recentShares,
    snoozedSignalsCount,
    dueSnoozesCount,
    dailyTopActions,
    liveIntent,
    pipelineImpact,
    strategicAccounts,
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
  const openRequests = (await getRequestsImpl()).filter((r) => r.status === 'pending')
  const blockers: AdminDashboardModel['blockers'] = []
  const auditFeed: AdminDashboardModel['auditFeed'] = []
  let contentRoi: AdminDashboardModel['contentRoi'] = {
    topStory: null,
    gapAlert: null,
  }
  let systemUsage: AdminDashboardModel['systemUsage'] = {
    activeUsers: 0,
    activeSeats: 0,
    dataFreshnessMinutes: null,
    apiCreditUsedPercent: null,
    apiHealth: 'stable',
    integrations: [
      { name: 'HubSpot', status: 'warning' },
      { name: 'Salesforce', status: 'warning' },
    ],
  }
  let newsIngestHealth: AdminDashboardModel['newsIngestHealth'] = {
    lastRunAt: null,
    mode: 'unknown',
    scannedCompanies: null,
    errors: 0,
  }

  if (orgId) {
    const [
      orgRow,
      pendingInvitesRes,
      activeProfilesRes,
      latestExecRes,
      latestNewsRes,
      auditRowsRes,
      zeroResultRowsRes,
    ] = await Promise.all([
      supabase
        .from('organizations')
        .select('workflow_settings')
        .eq('id', orgId)
        .maybeSingle(),
      supabase
        .from('organization_invites')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('accepted_at', null),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('market_signal_executive_events')
        .select('detected_at')
        .order('detected_at', { ascending: false })
        .limit(1),
      supabase
        .from('market_signal_account_news')
        .select('published_on')
        .order('published_on', { ascending: false })
        .limit(1),
      supabase
        .from('audit_logs')
        .select('id,action,timestamp,user_id,action_details')
        .eq('org_id', orgId)
        .order('timestamp', { ascending: false })
        .limit(80),
      supabase
        .from('audit_logs')
        .select('action_details')
        .eq('org_id', orgId)
        .in('action', ['reference_search_no_results', 'search_no_results', 'rfp_match_no_result'])
        .order('timestamp', { ascending: false })
        .limit(200),
    ])

    const pendingOver12h = openRequests.filter((r) => Date.now() - new Date(r.created_at).getTime() > 12 * 60 * 60 * 1000).length
    if (pendingOver12h > 0) {
      blockers.push({
        id: 'pending-content-requests',
        title: `${pendingOver12h} Content-Anfragen ausstehend`,
        detail: 'Wartezeit > 12h',
        ctaLabel: 'Review All',
        href: ROUTES.request,
        severity: 'high',
      })
    }

    const auditRows = (auditRowsRes.data ?? []) as Array<{
      id: string
      action: string
      timestamp: string
      user_id: string | null
      action_details: Record<string, unknown> | null
    }>
    const latestIngest = auditRows.find((row) => row.action === 'market_signals_ingest_run')
    if (latestIngest) {
      const details = latestIngest.action_details ?? {}
      const modeRaw = String(details.mode ?? 'unknown')
      const mode =
        modeRaw === 'all_accounts' || modeRaw === 'focus_only'
          ? (modeRaw as 'all_accounts' | 'focus_only')
          : 'unknown'
      const scannedRaw = Number(details.newsCompaniesScanned ?? NaN)
      const errorsRaw = Number(details.newsErrors ?? NaN)
      newsIngestHealth = {
        lastRunAt: latestIngest.timestamp,
        mode,
        scannedCompanies: Number.isFinite(scannedRaw) ? scannedRaw : null,
        errors: Number.isFinite(errorsRaw) ? Math.max(0, Math.trunc(errorsRaw)) : 0,
      }
    }
    const syncErrors = auditRows.filter((row) => /sync|integration|ingest_error/i.test(String(row.action))).length
    if (syncErrors > 0) {
      blockers.push({
        id: 'sync-errors',
        title: `Sync-Errors erkannt`,
        detail: `${syncErrors} fehlerhafte Integrations-Events`,
        ctaLabel: 'Fix Sync',
        href: ROUTES.settings,
        severity: 'high',
      })
    }

    const workflowSettings =
      orgRow.data?.workflow_settings && typeof orgRow.data.workflow_settings === 'object'
        ? (orgRow.data.workflow_settings as Record<string, unknown>)
        : {}
    const apiCreditUsedPercentRaw = workflowSettings.api_credit_used_percent
    const apiCreditUsedPercent =
      typeof apiCreditUsedPercentRaw === 'number' && Number.isFinite(apiCreditUsedPercentRaw)
        ? Math.max(0, Math.min(100, Math.round(apiCreditUsedPercentRaw)))
        : null
    if (apiCreditUsedPercent != null && apiCreditUsedPercent >= 85) {
      blockers.push({
        id: 'api-credit-warning',
        title: `API Credit Warnung`,
        detail: `${apiCreditUsedPercent}% verbraucht`,
        ctaLabel: 'Top up',
        href: ROUTES.settings,
        severity: 'medium',
      })
    }

    const top = topReferences[0] ?? null
    contentRoi = {
      topStory: top
        ? {
            title: top.title,
            impactLabel: `+${Math.max(1, Math.round(top.eventCount / 2))} Opps`,
          }
        : null,
      gapAlert: null,
    }
    const zeroRows = (zeroResultRowsRes.data ?? []) as Array<{ action_details?: Record<string, unknown> | null }>
    if (zeroRows.length) {
      const termCounts = new Map<string, number>()
      for (const row of zeroRows) {
        const details = row.action_details ?? {}
        const term = String(details.query ?? details.search ?? details.term ?? '').trim().toLowerCase()
        if (!term) continue
        termCounts.set(term, (termCounts.get(term) ?? 0) + 1)
      }
      const best = Array.from(termCounts.entries()).sort((a, b) => b[1] - a[1])[0]
      if (best) {
        contentRoi.gapAlert = { term: best[0], searches: best[1] }
      }
    }

    const activeSeats = activeProfilesRes.count ?? 0
    const pendingInvites = pendingInvitesRes.count ?? 0
    const latestExec = (latestExecRes.data?.[0] as { detected_at?: string } | undefined)?.detected_at ?? null
    const latestNews = (latestNewsRes.data?.[0] as { published_on?: string } | undefined)?.published_on ?? null
    const latestTs = Math.max(
      latestExec ? new Date(latestExec).getTime() : 0,
      latestNews ? new Date(latestNews).getTime() : 0
    )
    const dataFreshnessMinutes = latestTs > 0 ? Math.max(0, Math.round((Date.now() - latestTs) / 60000)) : null

    const integrationSettings =
      workflowSettings.integration_settings && typeof workflowSettings.integration_settings === 'object'
        ? (workflowSettings.integration_settings as Record<string, unknown>)
        : {}
    const integrationStatus = (key: string): 'healthy' | 'warning' | 'down' => {
      const val = integrationSettings[key]
      if (val === true || val === 'connected') return 'healthy'
      if (val === 'error' || val === 'down') return 'down'
      return 'warning'
    }
    const integrations: AdminDashboardModel['systemUsage']['integrations'] = [
      { name: 'HubSpot', status: integrationStatus('hubspot') },
      { name: 'Salesforce', status: integrationStatus('salesforce') },
    ]
    const hasDown = integrations.some((i) => i.status === 'down')
    const hasWarn = integrations.some((i) => i.status === 'warning')
    const apiHealth: 'stable' | 'warning' | 'critical' = hasDown ? 'critical' : hasWarn ? 'warning' : 'stable'
    systemUsage = {
      activeUsers: wau7d,
      activeSeats: activeSeats + pendingInvites,
      dataFreshnessMinutes,
      apiCreditUsedPercent,
      apiHealth,
      integrations,
    }

    const userIdsForAudit = Array.from(new Set(auditRows.map((r) => r.user_id).filter(Boolean) as string[]))
    const { data: auditUsers } = userIdsForAudit.length
      ? await supabase.from('profiles').select('id,full_name').in('id', userIdsForAudit)
      : { data: [] as Array<{ id: string; full_name: string | null }> }
    const nameById = new Map((auditUsers ?? []).map((u) => [u.id, u.full_name ?? 'User']))
    auditFeed.push(
      ...auditRows.slice(0, 12).map((row) => {
        const actor = row.user_id ? nameById.get(row.user_id) ?? 'User' : 'System'
        const action = String(row.action ?? '').replace(/_/g, ' ')
        return {
          id: row.id,
          text: `${actor}: ${action}`,
          timestamp: row.timestamp,
        }
      })
    )

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
    blockers,
    contentRoi,
    systemUsage,
    newsIngestHealth,
    auditFeed,
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
