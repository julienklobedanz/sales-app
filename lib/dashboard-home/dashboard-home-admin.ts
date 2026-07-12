import type { SupabaseClient } from '@supabase/supabase-js'
import { getDeals } from '@/app/dashboard/deals/actions'
import { getRequestsImpl } from '@/lib/references/library/approval-requests'
import { ROUTES } from '@/lib/routes'
import {
  ACTIVE_DEAL_STATUSES,
  type AdminDashboardModel,
  type LeaderPipelineSignalRow,
  type TeamActivityRow,
  type TopReferenceRow,
} from '@/lib/dashboard-home/dashboard-home-types'
import { loadReferenceKpis } from '@/lib/dashboard-home/dashboard-home-queries'
import {
  computeWinRateMetrics,
  dashboardFirstName,
  integrationConnectionStatus,
  teamActivityLabelForEvent,
} from '@/lib/dashboard-home/dashboard-home-pure'
import { normalizeOrgDateDisplayFormat, type OrgDateDisplayFormat } from '@/lib/format'
import {
  aggregateTeamMatches,
  buildLeaderCoaching,
  buildLeaderCoveragePipeline,
  buildLeaderRiskDeals,
  buildLeaderSignalRisks,
  buildWinRateCompare,
} from '@/lib/dashboard-home/build-leader-dashboard'

export async function loadAdminDashboardData(
  supabase: SupabaseClient,
  fullName: string | null,
  orgId: string | undefined
): Promise<AdminDashboardModel> {
  const greetingName = dashboardFirstName(fullName) || 'du'

  const kpisBase = orgId ? await loadReferenceKpis(supabase, orgId) : { total: 0, approved: 0, internal: 0, draft: 0 }
  const referencesTotal = kpisBase.total

  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)
  const prevSince7 = new Date()
  prevSince7.setDate(prevSince7.getDate() - 14)

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

  let dateDisplayFormat: OrgDateDisplayFormat = 'de-DE'

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
        .select('workflow_settings, date_display_format')
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

    dateDisplayFormat = normalizeOrgDateDisplayFormat(
      (orgRow.data as { date_display_format?: string | null } | null)?.date_display_format
    )

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
    const integrationStatus = (key: string) => integrationConnectionStatus(integrationSettings[key])
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

    const [
      refCurrentRes,
      refPrevRes,
      mRes,
      mPrevRes,
      s1Res,
      s2Res,
      ps1Res,
      ps2Res,
      distinctUsersRes,
      prevDistinctUsersRes,
    ] = await Promise.all([
      supabase
        .from('references')
        .select('id', { count: 'planned', head: true }) // KPI-Trend, ±1 akzeptabel
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('created_at', since7.toISOString()),
      supabase
        .from('references')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('created_at', prevSince7.toISOString())
        .lt('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_matched')
        .gte('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_matched')
        .gte('created_at', prevSince7.toISOString())
        .lt('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_shared')
        .gte('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'share_link_viewed')
        .gte('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_shared')
        .gte('created_at', prevSince7.toISOString())
        .lt('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'share_link_viewed')
        .gte('created_at', prevSince7.toISOString())
        .lt('created_at', since7.toISOString()),
      supabase
        .from('evidence_events')
        .select('created_by')
        .eq('organization_id', orgId)
        .gte('created_at', since7.toISOString())
        .not('created_by', 'is', null),
      supabase
        .from('evidence_events')
        .select('created_by')
        .eq('organization_id', orgId)
        .gte('created_at', prevSince7.toISOString())
        .lt('created_at', since7.toISOString())
        .not('created_by', 'is', null),
    ])

    referencesCreated7d = refCurrentRes.count ?? 0
    prevReferencesCreated7d = refPrevRes.count ?? 0
    matches7d = mRes.count ?? 0
    prevMatches7d = mPrevRes.count ?? 0
    shares7d = (s1Res.count ?? 0) + (s2Res.count ?? 0)
    prevShares7d = (ps1Res.count ?? 0) + (ps2Res.count ?? 0)
    wau7d = new Set((distinctUsersRes.data ?? []).map((r) => r.created_by as string)).size
    prevWau7d = new Set((prevDistinctUsersRes.data ?? []).map((r) => r.created_by as string)).size

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
        const actionLabel = teamActivityLabelForEvent(eventType)
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

  const allDealsForSignals = await getDeals()
  const openDealsByCompany = new Map<string, { companyName: string; count: number }>()
  for (const deal of allDealsForSignals) {
    if (!ACTIVE_DEAL_STATUSES.includes(deal.status)) continue
    const cid = deal.company_id
    if (!cid) continue
    const current = openDealsByCompany.get(cid) ?? {
      companyName: deal.company_name ?? 'Account',
      count: 0,
    }
    current.count += 1
    openDealsByCompany.set(cid, current)
  }

  let pipelineSignals: LeaderPipelineSignalRow[] = []
  if (orgId) {
    const { data: execForLeader } = await supabase
      .from('market_signal_executive_events')
      .select('company_id, change_summary, companies(name)')
      .order('detected_at', { ascending: false })
      .limit(80)
    const signalCounts = new Map<string, { count: number; summary: string; name: string }>()
    for (const row of execForLeader ?? []) {
      const cid = String((row as { company_id?: string }).company_id ?? '')
      if (!cid || !openDealsByCompany.has(cid)) continue
      const company = Array.isArray((row as { companies?: unknown }).companies)
        ? ((row as { companies: { name?: string }[] }).companies[0])
        : ((row as { companies?: { name?: string } | null }).companies)
      const cur = signalCounts.get(cid) ?? {
        count: 0,
        summary: String((row as { change_summary?: string }).change_summary ?? 'Signal'),
        name: String(company?.name ?? openDealsByCompany.get(cid)?.companyName ?? 'Account'),
      }
      cur.count += 1
      signalCounts.set(cid, cur)
    }
    const SIGNAL_THRESHOLD = 2
    pipelineSignals = Array.from(signalCounts.entries())
      .filter(([, v]) => v.count >= SIGNAL_THRESHOLD)
      .map(([companyId, v]) => ({
        companyId,
        companyName: v.name,
        openDealCount: openDealsByCompany.get(companyId)?.count ?? 0,
        signalCount: v.count,
        latestSummary: v.summary,
        href: ROUTES.accountsDetail(companyId),
      }))
      .sort((a, b) => b.signalCount - a.signalCount)
      .slice(0, 8)
  }

  const closedDeals = allDealsForSignals.filter((d) => d.status === 'won' || d.status === 'lost')
  const minDealsRequired = 5
  const wonCount = closedDeals.filter((d) => d.status === 'won').length
  const { available: winRateAvailable, percent: winRatePercent, closedDealsCount: closedDealsCountAdmin } = computeWinRateMetrics(
    closedDeals.length,
    wonCount,
    minDealsRequired
  )

  let riskDeals = buildLeaderRiskDeals(allDealsForSignals, { dateDisplayFormat })
  let coachingSignals: AdminDashboardModel['coachingSignals'] = []
  let coveragePipeline = buildLeaderCoveragePipeline(
    pipelineSignals,
    contentRoi.gapAlert?.term ?? null
  )
  let signalRisks: AdminDashboardModel['signalRisks'] = []
  const winRateCompare = buildWinRateCompare(closedDeals, minDealsRequired)

  if (orgId) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, function_role')
      .eq('organization_id', orgId)
      .limit(40)

    const matchCounts = aggregateTeamMatches(teamActivity)
    const pendingByUser = new Map<string, number>()
    for (const req of openRequests) {
      // requester not in openRequests type - skip detailed pending by user
    }

    coachingSignals = buildLeaderCoaching(
      (profileRows ?? []) as Array<{ id: string; full_name: string | null; function_role: string | null }>,
      matchCounts,
      pendingByUser
    )

    const openHighValue = allDealsForSignals.filter(
      (d) =>
        ACTIVE_DEAL_STATUSES.includes(d.status) &&
        (d.volume?.includes('Mio') || d.volume?.includes('Mio'))
    )
    const companyIds = [...new Set(openHighValue.map((d) => d.company_id).filter(Boolean) as string[])]
    let championLossCount = 0
    if (companyIds.length) {
      const { data: execLoss } = await supabase
        .from('market_signal_executive_events')
        .select('company_id, change_summary')
        .in('company_id', companyIds)
        .order('detected_at', { ascending: false })
        .limit(40)
      championLossCount = (execLoss ?? []).filter((row) =>
        /verlass|wechsel|ausgeschieden|left/i.test(String((row as { change_summary?: string }).change_summary ?? ''))
      ).length
    }

    signalRisks = buildLeaderSignalRisks({
      championLossCount: Math.min(championLossCount, openHighValue.length),
      unansweredTriggers: Math.max(0, pipelineSignals.length - 1),
      totalTriggers: pipelineSignals.length,
    })
  }

  const shareRatePercent =
    matches7d > 0 ? Math.min(100, Math.round((shares7d / matches7d) * 100)) : null

  return {
    greetingName,
    kpis: {
      referencesTotal,
      matches7d,
      shares7d,
      wau7d,
    },
    riskDeals,
    coachingSignals,
    coveragePipeline,
    signalRisks,
    winRateCompare,
    footerStats: {
      referencesTotal,
      activeUsers: wau7d,
      shareRatePercent,
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
    pipelineSignals,
    winRate: {
      available: winRateAvailable,
      percent: winRatePercent,
      closedDealsCount: closedDealsCountAdmin,
      minDealsRequired,
    },
  }
}
