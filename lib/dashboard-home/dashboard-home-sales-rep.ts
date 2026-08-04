import type { SupabaseClient } from '@supabase/supabase-js'
import { getDeals } from '@/app/dashboard/deals/actions'
import type { DealRow } from '@/app/dashboard/deals/types'
import { ROUTES } from '@/lib/routes'
import {
  ACTIVE_DEAL_STATUSES,
  type RecentShareRow,
  type SalesRepDashboardModel,
  type SalesRepDealCard,
} from '@/lib/dashboard-home/dashboard-home-types'
import {
  countDueMarketSnoozes,
  dashboardFirstName,
  meddpiccAccountAction,
} from '@/lib/dashboard-home/dashboard-home-pure'

export async function loadSalesRepDashboardData(
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  orgId: string | undefined,
): Promise<SalesRepDashboardModel> {
  const greetingName = dashboardFirstName(fullName) || 'du'

  const allDeals = await getDeals()
  const activeDeals: SalesRepDealCard[] = allDeals
    .filter(
      (d) => d.sales_manager_id === userId && ACTIVE_DEAL_STATUSES.includes(d.status),
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

  let recentShares: RecentShareRow[] = []
  let snoozedSignalsCount = 0
  let dueSnoozesCount = 0
  let matches7d = 0
  let shares7d = 0
  let liveIntent: SalesRepDashboardModel['liveIntent'] = []
  let strategicAccounts: SalesRepDashboardModel['strategicAccounts'] = []

  if (orgId) {
    const since7 = new Date()
    since7.setDate(since7.getDate() - 7)

    const [signalReadRows, execRows, newsRows, intentRows, matchCountRes, shareCountRes] =
      await Promise.all([
        supabase
          .from('notification_inbox_reads')
          .select('notification_key,read_at')
          .eq('user_id', userId)
          .or(
            'notification_key.like.market_snooze_until:%,notification_key.like.market_priority:today:%',
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
        supabase
          .from('evidence_events')
          .select('id', { count: 'planned', head: true })
          .eq('organization_id', orgId)
          .eq('created_by', userId)
          .eq('event_type', 'reference_matched')
          .gte('created_at', since7.toISOString()),
        supabase
          .from('evidence_events')
          .select('id', { count: 'planned', head: true })
          .eq('organization_id', orgId)
          .eq('created_by', userId)
          .in('event_type', ['reference_shared', 'share_link_viewed'])
          .gte('created_at', since7.toISOString()),
      ])

    matches7d = matchCountRes.count ?? 0
    shares7d = shareCountRes.count ?? 0

    const snoozeKeys = (signalReadRows.data ?? [])
      .map((row) =>
        String((row as { notification_key?: string | null }).notification_key ?? ''),
      )
      .filter((k) => k.startsWith('market_snooze_until:'))
    snoozedSignalsCount = snoozeKeys.length
    const nowMs = Date.now()
    dueSnoozesCount = countDueMarketSnoozes(snoozeKeys, nowMs)

    const intentEvents = (intentRows.data ?? []) as Array<{
      id?: string | null
      event_type?: string | null
      created_at?: string | null
      payload?: { slug?: string | null } | null
      reference_id?: string | null
    }>
    const intentRefIds = Array.from(
      new Set(intentEvents.map((e) => e.reference_id).filter(Boolean) as string[]),
    )
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
      }),
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

    const signalCountByCompany = new Map<
      string,
      { companyName: string; count: number; latestSummary: string }
    >()
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
        : Promise.resolve({
            data: [] as Array<{
              company_id: string
              company_goals: string | null
              next_steps: string | null
            }>,
          }),
    ])

    const rolesByCompany = new Map<string, Set<string>>()
    for (const row of (stakeholderRows.data ?? []) as Array<{
      company_id?: string | null
      role?: string | null
    }>) {
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
      ]),
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
        const { meddpiccGap, actionLabel } = meddpiccAccountAction({
          hasChampion,
          hasEconomic,
          hasGoals,
        })
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
          .filter(Boolean),
      ),
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

    const refMetaById = new Map<
      string,
      { title: string | null; accountName: string | null }
    >()
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
    for (const row of (sharedRows ?? []) as Array<{
      slug: string
      reference_ids: string[] | null
    }>) {
      const ids = Array.isArray(row.reference_ids)
        ? row.reference_ids.map((id) => String(id))
        : []
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
    strategicAccounts.map((s) => [s.companyId, s.signalCount24h] as const),
  )
  const dealsWithSignals = activeDeals.map((deal) => ({
    ...deal,
    recentSignalCount: deal.company_id ? (signalByCompany.get(deal.company_id) ?? 0) : 0,
  }))

  const dealsWithProof = dealsWithSignals.filter((d) => d.linkedCount > 0).length

  return {
    greetingName,
    activeDeals: dealsWithSignals,
    recentShares,
    snoozedSignalsCount,
    dueSnoozesCount,
    liveIntent,
    strategicAccounts,
    footerStats: {
      matches7d,
      shares7d,
      dealsWithProof,
      dealsTotal: dealsWithSignals.length,
    },
  }
}
