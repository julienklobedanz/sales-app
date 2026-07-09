import type { getPendingClientApprovalsImpl } from '@/lib/references/library/pending-approvals'
import type { getRequestsImpl } from '@/lib/references/library/approval-requests'
import type { DealStatus } from '@/app/dashboard/deals/types'

export const ACTIVE_DEAL_STATUSES: DealStatus[] = ['open', 'rfp', 'negotiation']

export type SalesRepDealCard = {
  id: string
  title: string
  status: DealStatus
  company_id: string | null
  company_name: string | null
  company_logo_url?: string | null
  volume: string | null
  expiry_date: string | null
  linkedCount: number
  bestMatchScore: number | null
  quickShareReferenceId: string | null
  recentSignalCount: number
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
  recentShares: RecentShareRow[]
  snoozedSignalsCount: number
  dueSnoozesCount: number
  liveIntent: Array<{
    id: string
    text: string
    createdAt: string
    href: string | null
  }>
  strategicAccounts: Array<{
    companyId: string
    companyName: string
    signalSummary: string
    signalCount24h: number
    meddpiccGap: string
    actionLabel: string
    href: string
  }>
  footerStats: {
    matches7d: number
    shares7d: number
    dealsWithProof: number
    dealsTotal: number
  }
}

export type GeneralistDashboardModel = {
  leadQuestion: string
  activeDeals: SalesRepDealCard[]
  pendingApprovalsCount: number
  pendingApprovalsPreview: Array<{
    approvalId: string
    referenceId: string
    title: string
    companyName: string
  }>
  usageTotals: UsageTotalsRow
  recentShares: RecentShareRow[]
}

export type LeaderPipelineSignalRow = {
  companyId: string
  companyName: string
  openDealCount: number
  signalCount: number
  latestSummary: string
  href: string
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

export type DashboardQueueTone = 'gap' | 'warn' | 'intent' | 'neutral' | 'info'

export type DashboardQueueItem = {
  tone: DashboardQueueTone
  title: string
  meta?: string
  ctaLabel: string
  href: string
}

export type DashboardFreshnessRow = {
  id: string
  name: string
  summary: string
  tone: 'ok' | 'warn' | 'gap'
  href: string
}

export type DashboardWhitespotRow = {
  label: string
  countLabel: string
  tone: 'gap' | 'warn'
  href: string
}

export type DashboardFunnelStep = {
  label: string
  value: number
}

export type DashboardAdvocateRow = {
  label: string
  value: number
  display: string
  tone?: 'warn'
}

export type AccountManagerDashboardModel = {
  greetingName: string
  kpis: ReferenceKpiCounts
  pendingApprovalsCount: number
  pendingApprovals: Awaited<ReturnType<typeof getPendingClientApprovalsImpl>>
  usageTotals: UsageTotalsRow
  digest: DashboardQueueItem[]
  freshness: DashboardFreshnessRow[]
  freshnessMoreCount: number
  whitespots: DashboardWhitespotRow[]
  approvalFunnel: DashboardFunnelStep[]
  advocateLoad: DashboardAdvocateRow[]
  footerStats: {
    referencesTotal: number
    pendingApprovals: number
    advocateRequests: number
  }
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

export type LeaderRiskDealRow = {
  id: string
  title: string
  valueLabel: string
  coverageLabel: string
  tone: 'gap' | 'warn' | 'ok'
  ctaLabel: string | null
  href: string
}

export type LeaderCoachingRow = {
  who: string
  signal: string
  tone: 'gap' | 'warn' | 'ok'
}

export type LeaderCoveragePipelineRow = {
  label: string
  sublabel: string
  tone: 'gap' | 'warn' | 'ok'
}

export type LeaderSignalRiskRow = {
  tone: 'gap' | 'warn'
  text: string
  ctaLabel: string
  href: string
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
  riskDeals: LeaderRiskDealRow[]
  coachingSignals: LeaderCoachingRow[]
  coveragePipeline: LeaderCoveragePipelineRow[]
  signalRisks: LeaderSignalRiskRow[]
  winRateCompare: {
    available: boolean
    withReferencePercent: number | null
    withoutReferencePercent: number | null
    closedDealsCount: number
    minDealsRequired: number
  }
  footerStats: {
    referencesTotal: number
    activeUsers: number
    shareRatePercent: number | null
  }
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
  pipelineSignals: LeaderPipelineSignalRow[]
  winRate: {
    available: boolean
    percent: number | null
    closedDealsCount: number
    minDealsRequired: number
  }
}
