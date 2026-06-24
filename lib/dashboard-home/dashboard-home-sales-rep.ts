import type { SupabaseClient } from '@supabase/supabase-js'
import { matchReferences } from '@/app/dashboard/actions'
import { getDeals } from '@/app/dashboard/deals/actions'
import type { DealRow } from '@/app/dashboard/deals/types'
import { ROUTES } from '@/lib/routes'
import { ACTIVE_DEAL_STATUSES, type RecommendedRefRow, type RecentShareRow, type SalesRepDashboardModel, type SalesRepDealCard } from '@/lib/dashboard-home/dashboard-home-types'
import {
  computeWinRateMetrics,
  countDueMarketSnoozes,
  dashboardFirstName,
  meddpiccAccountAction,
} from '@/lib/dashboard-home/dashboard-home-pure'

export async function loadSalesRepDashboardData(
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  orgId: string | undefined
): Promise<SalesRepDashboardModel> {
  const greetingName = dashboardFirstName(fullName) || 'du'

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
      company_id: d.company_id ?? null,
      company_name: d.company_name,
      company_logo_url: d.company_logo_url ?? null,
      volume: d.volume ?? null,
      expiry_date: d.expiry_date,
      linkedCount: d.linked_refs?.length ?? 0,
      bestMatchScore: d.best_match_score ?? null,
      quickShareReferenceId: d.linked_refs?.[0]?.id ?? null,
      recentSignalCount: 0,
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

  let recentShares: RecentShareRow[] = []
  let snoozedSignalsCount = 0
  let dueSnoozesCount = 0
  let dailyTopActions: SalesRepDashboardModel['dailyTopActions'] = []
  let liveIntent: SalesRepDashboardModel['liveIntent'] = []
  let strategicAccounts: SalesRepDashboardModel['strategicAccounts'] = []

  const closedDeals = allDeals.filter(
    (d) => d.sales_manager_id === userId && (d.status === 'won' || d.status === 'lost')
  )
  const wonCount = closedDeals.filter((d) => d.status === 'won').length
  const minClosedForWinRate = 3
  const { available: winRateAvailable, percent: winRatePercent, closedDealsCount } = computeWinRateMetrics(
    closedDeals.length,
    wonCount,
    minClosedForWinRate
  )
  const pipelineImpact: SalesRepDashboardModel['pipelineImpact'] = {
    winRateAvailable,
    winRatePercent,
    closedDealsCount,
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
    dueSnoozesCount = countDueMarketSnoozes(snoozeKeys, nowMs)

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
        href: latestExec?.company_id
          ? ROUTES.accountsDetail(String(latestExec.company_id))
          : ROUTES.accounts,
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
        href: latestNews?.company_id
          ? ROUTES.accountsDetail(String(latestNews.company_id))
          : ROUTES.accounts,
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
        href: ROUTES.accounts,
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
        const { meddpiccGap, actionLabel } = meddpiccAccountAction({ hasChampion, hasEconomic, hasGoals })
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

  const signalByCompany = new Map(
    strategicAccounts.map((s) => [s.companyId, s.signalCount24h] as const)
  )
  const dealsWithSignals = activeDeals.map((deal) => ({
    ...deal,
    recentSignalCount: deal.company_id ? (signalByCompany.get(deal.company_id) ?? 0) : 0,
  }))

  return {
    greetingName,
    activeDeals: dealsWithSignals,
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
