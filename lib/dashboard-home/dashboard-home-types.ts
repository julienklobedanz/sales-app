import type { getPendingClientApprovalsImpl } from '@/lib/evidence/pending-approvals'
import type { getRequestsImpl } from '@/lib/evidence/approval-requests'
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
    winRateAvailable: boolean
    winRatePercent: number | null
    closedDealsCount: number
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
  pipelineSignals: LeaderPipelineSignalRow[]
  winRate: {
    available: boolean
    percent: number | null
    closedDealsCount: number
    minDealsRequired: number
  }
}
