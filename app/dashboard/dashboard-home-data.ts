export type {
  AccountManagerDashboardModel,
  AdminDashboardModel,
  AdminKpiStrip,
  GeneralistDashboardModel,
  LeaderPipelineSignalRow,
  RecentShareRow,
  RecommendedRefRow,
  ReferenceKpiCounts,
  SalesRepDashboardModel,
  SalesRepDealCard,
  TeamActivityRow,
  TopReferenceRow,
  UsageTotalsRow,
  WeeklyTrendStrip,
} from '@/lib/dashboard-home/dashboard-home-types'

export { ACTIVE_DEAL_STATUSES } from '@/lib/dashboard-home/dashboard-home-types'

export { loadSalesRepDashboardData } from '@/lib/dashboard-home/dashboard-home-sales-rep'
export { loadAccountManagerDashboardData } from '@/lib/dashboard-home/dashboard-home-account-manager'
export { loadAdminDashboardData } from '@/lib/dashboard-home/dashboard-home-admin'
export { loadGeneralistDashboardData } from '@/lib/dashboard-home/dashboard-home-generalist'
export {
  loadDashboardHomeForFunctionRole,
  type DashboardHomePayload,
} from '@/lib/dashboard-home/dashboard-home-dispatch'
