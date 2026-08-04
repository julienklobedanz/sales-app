import type { SupabaseClient } from '@supabase/supabase-js'
import { getRequestsImpl } from '@/lib/references/library/approval-requests'
import { getPendingClientApprovalsImpl } from '@/lib/references/library/pending-approvals'
import { MASTER_INDUSTRIES } from '@/lib/constants/industries'
import { COPY } from '@/lib/copy'
import { shouldNotifyNdaExpiry } from '@/lib/accounts/nda-expiry'
import { ACTIVE_DEAL_STATUSES } from '@/lib/dashboard-home/dashboard-home-types'
import type {
  AccountManagerDashboardModel,
  DashboardAdvocateRow,
  DashboardFreshnessRow,
  DashboardFunnelStep,
  DashboardQueueItem,
  DashboardWhitespotRow,
  UsageTotalsRow,
} from '@/lib/dashboard-home/dashboard-home-types'
import { formatCopy } from '@/lib/dashboard-home/copy-format'
import { loadReferenceKpis } from '@/lib/dashboard-home/dashboard-home-queries'
import { dashboardFirstName } from '@/lib/dashboard-home/dashboard-home-pure'
import { getDeals } from '@/app/dashboard/deals/actions'
import { ROUTES } from '@/lib/routes'

const ADVOCATE_WARN_THRESHOLD = 3
const STALE_MONTHS = 24

export async function loadAccountManagerDashboardData(
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  orgId: string | undefined
): Promise<AccountManagerDashboardModel> {
  const greetingName = dashboardFirstName(fullName) || 'du'
  const copy = COPY.dashboard.home.accountManager

  const kpis = orgId
    ? await loadReferenceKpis(supabase, orgId)
    : { total: 0, approved: 0, internal: 0, draft: 0 }

  const pendingApprovals = await getPendingClientApprovalsImpl()
  const pendingApprovalsCount = pendingApprovals.length
  const openRequests = (await getRequestsImpl()).filter((r) => r.status === 'pending')

  let usageTotals: UsageTotalsRow = { views: 0, shares: 0, matches: 0 }
  const digest: DashboardQueueItem[] = []
  const freshnessRows: DashboardFreshnessRow[] = []
  let freshnessOut: DashboardFreshnessRow[] = []
  let freshnessMoreCount = 0
  const whitespots: DashboardWhitespotRow[] = []
  const approvalFunnel: DashboardFunnelStep[] = []
  const advocateLoad: DashboardAdvocateRow[] = []
  let advocateRequests = 0

  if (orgId) {
    const since30 = new Date()
    since30.setDate(since30.getDate() - 30)

    const [viewsRes, shareARes, shareBRes, matchesRes, refsRes, ndaRes, dealReqRes] = await Promise.all([
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_viewed')
        .gte('created_at', since30.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_shared')
        .gte('created_at', since30.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'share_link_viewed')
        .gte('created_at', since30.toISOString()),
      supabase
        .from('evidence_events')
        .select('id', { count: 'planned', head: true })
        .eq('organization_id', orgId)
        .eq('event_type', 'reference_matched')
        .gte('created_at', since30.toISOString()),
      supabase
        .from('references')
        .select('id, title, status, updated_at, customer_approval_status, company_id, industry, companies(name)')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: true })
        .limit(80),
      supabase
        .from('nda_agreements')
        .select('id, company_id, valid_until, status, companies(name)')
        .eq('organization_id', orgId)
        .limit(200),
      supabase
        .from('deal_reference_requests')
        .select('id, deal_id, created_at, status, deals(company_id, companies(name))')
        .eq('organization_id', orgId)
        .eq('status', 'pending'),
    ])

    void dealReqRes

    usageTotals = {
      views: viewsRes.count ?? 0,
      shares: (shareARes.count ?? 0) + (shareBRes.count ?? 0),
      matches: matchesRes.count ?? 0,
    }

    if (pendingApprovalsCount > 0) {
      const oldest = pendingApprovals.reduce((min, p) => {
        const t = new Date(p.requestedAt).getTime()
        return t < min ? t : min
      }, Date.now())
      const days = Math.max(1, Math.round((Date.now() - oldest) / (24 * 60 * 60 * 1000)))
      digest.push({
        tone: 'info',
        title: formatCopy(copy.digestApprovals, { n: pendingApprovalsCount }),
        meta: formatCopy(copy.digestApprovalsMeta, { days }),
        ctaLabel: copy.digestApprovalsCta,
        href: ROUTES.references.root,
      })
    }

    if (openRequests.length > 0) {
      digest.push({
        tone: 'intent',
        title: formatCopy(copy.digestDealRequests, { n: openRequests.length }),
        meta: openRequests
          .slice(0, 2)
          .map((r) => r.company_name)
          .filter(Boolean)
          .join(', '),
        ctaLabel: copy.digestDealRequestsCta,
        href: ROUTES.request,
      })
    }

    const refRows = (refsRes.data ?? []) as Array<{
      id: string
      title: string | null
      status: string | null
      updated_at: string | null
      customer_approval_status: string | null
      company_id: string | null
      industry: string | null
    }>

    let draft = 0
    let internal = 0
    let customer = 0
    let approved = 0
    for (const row of refRows) {
      const status = String(row.status ?? 'draft')
      if (status === 'draft') draft += 1
      else if (status === 'internal_only') internal += 1
      else if (row.customer_approval_status === 'pending') customer += 1
      else if (status === 'approved' || status === 'external' || status === 'anonymized') approved += 1
    }
    approvalFunnel.push(
      { label: copy.funnelDraft, value: draft },
      { label: copy.funnelInternal, value: internal },
      { label: copy.funnelCustomer, value: customer },
      { label: copy.funnelApproved, value: approved }
    )

    const staleCutoff = new Date()
    staleCutoff.setMonth(staleCutoff.getMonth() - STALE_MONTHS)

    for (const row of refRows) {
      const updated = row.updated_at ? new Date(row.updated_at) : null
      const companiesRaw = (row as { companies?: { name?: string } | { name?: string }[] | null }).companies
      const company = Array.isArray(companiesRaw)
        ? companiesRaw[0]?.name
        : companiesRaw?.name
      const title = row.title ?? company ?? 'Account'
      if (updated && updated < staleCutoff) {
        freshnessRows.push({
          id: row.id,
          name: title,
          summary: 'Ergebnisse veraltet — aktualisieren',
          tone: 'gap',
          href: ROUTES.references.detail(row.id),
        })
      }
    }

    for (const row of (ndaRes.data ?? []) as Array<{
      company_id: string | null
      valid_until: string | null
      status: string | null
      companies?: { name?: string } | { name?: string }[] | null
    }>) {
      const notify = shouldNotifyNdaExpiry({
        status: String(row.status ?? ''),
        validUntil: row.valid_until,
      })
      if (!notify || !row.company_id) continue
      const company = Array.isArray(row.companies)
        ? row.companies[0]?.name
        : row.companies?.name
      freshnessRows.push({
        id: `nda-${row.company_id}`,
        name: company ?? 'Account',
        summary: `NDA läuft in ${notify.daysUntil} Tagen ab`,
        tone: notify.urgency === 'critical' ? 'gap' : 'warn',
        href: ROUTES.accountsDetail(row.company_id),
      })
    }

    freshnessRows.sort((a) => (a.tone === 'gap' ? -1 : a.tone === 'warn' ? 0 : 1))
    if (freshnessRows.length > 4) {
      freshnessMoreCount = freshnessRows.length - 3
    }
    freshnessOut = freshnessRows.slice(0, 3)
    if (freshnessMoreCount > 0) {
      freshnessOut.push({
        id: 'more-fresh',
        name: formatCopy(copy.freshMore, { n: freshnessMoreCount }),
        summary: copy.freshMoreSub,
        tone: 'ok',
        href: ROUTES.references.root,
      })
    }

    const allDeals = await getDeals()
    const openDeals = allDeals.filter((d) => ACTIVE_DEAL_STATUSES.includes(d.status))
    const dealIndustries = new Map<string, number>()
    for (const deal of openDeals) {
      if (!deal.industry) continue
      dealIndustries.set(deal.industry, (dealIndustries.get(deal.industry) ?? 0) + 1)
    }

    const refIndustries = new Map<string, number>()
    for (const row of refRows) {
      if (!row.industry) continue
      refIndustries.set(row.industry, (refIndustries.get(row.industry) ?? 0) + 1)
    }

    for (const ind of MASTER_INDUSTRIES) {
      const dealCount = dealIndustries.get(ind.id) ?? 0
      if (dealCount === 0) continue
      const refCount = refIndustries.get(ind.id) ?? 0
      if (refCount === 0) {
        whitespots.push({
          label: ind.labelDe,
          countLabel: '0 ⚠',
          tone: 'gap',
          href: ROUTES.references.new,
        })
      } else if (refCount === 1) {
        whitespots.push({
          label: ind.labelDe,
          countLabel: '1 schwach',
          tone: 'warn',
          href: ROUTES.references.root,
        })
      }
    }
    whitespots.splice(6)

    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data: advocateRows } = await supabase
      .from('deal_reference_requests')
      .select('deal_id, deals(company_id, companies(name))')
      .eq('organization_id', orgId)
      .gte('created_at', since90.toISOString())

    const byCompany = new Map<string, { name: string; count: number }>()
    for (const row of (advocateRows ?? []) as Array<{
      deals?: { company_id?: string | null; companies?: { name?: string } | { name?: string }[] | null } | null
    }>) {
      const deal = row.deals
      const cid = deal?.company_id
      if (!cid) continue
      const company = Array.isArray(deal.companies)
        ? deal.companies[0]?.name
        : deal.companies?.name
      const cur = byCompany.get(cid) ?? { name: company ?? 'Account', count: 0 }
      cur.count += 1
      byCompany.set(cid, cur)
    }

    advocateRequests = advocateRows?.length ?? 0
    for (const [companyId, v] of byCompany.entries()) {
      const warn = v.count >= ADVOCATE_WARN_THRESHOLD
      if (warn) {
        digest.push({
          tone: 'warn',
          title: formatCopy(copy.digestAdvocateWarn, { company: v.name }),
          meta: copy.digestAdvocateMeta,
          ctaLabel: copy.digestAdvocateCta,
          href: ROUTES.accountsDetail(companyId),
        })
      }
      advocateLoad.push({
        label: v.name,
        value: v.count,
        display: warn ? `${v.count}× ⚠` : `${v.count}×`,
        tone: warn ? 'warn' : undefined,
      })
    }
    advocateLoad.sort((a, b) => b.value - a.value).splice(8)
  }

  return {
    greetingName,
    kpis,
    pendingApprovalsCount,
    pendingApprovals,
    usageTotals,
    digest: digest.slice(0, 6),
    freshness: freshnessOut,
    freshnessMoreCount,
    whitespots,
    approvalFunnel,
    advocateLoad,
    footerStats: {
      referencesTotal: kpis.total,
      pendingApprovals: pendingApprovalsCount,
      advocateRequests,
    },
  }
}
