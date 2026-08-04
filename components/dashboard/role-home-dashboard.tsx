'use client'

import type {
  AccountManagerDashboardModel,
  AdminDashboardModel,
  GeneralistDashboardModel,
  SalesRepDashboardModel,
} from '@/app/dashboard/dashboard-home-data'
import { AccountManagerDashboard } from '@/components/dashboard/account-manager-dashboard'
import { CommandCenter } from '@/components/dashboard/command-center'
import { GeneralistDashboard } from '@/components/dashboard/generalist-dashboard'
import { RoleDashboardShell } from '@/components/dashboard/role-dashboard-shell'
import { SalesLeaderDashboard } from '@/components/dashboard/sales-leader-dashboard'
import { SalesRepDashboard } from '@/components/dashboard/sales-rep-dashboard'
import { COPY } from '@/lib/copy'
import type { FunctionRole } from '@/lib/roles/capabilities'
import { ROUTES } from '@/lib/routes'

export type RoleHomeDashboardPayload =
  | { variant: 'sales_rep'; data: SalesRepDashboardModel }
  | { variant: 'account_manager'; data: AccountManagerDashboardModel }
  | { variant: 'sales_leader'; data: AdminDashboardModel }
  | { variant: 'generalist'; data: GeneralistDashboardModel }

export function RoleHomeDashboard({
  payload,
  greetingName,
  functionRole,
  thin = false,
}: {
  payload: RoleHomeDashboardPayload
  greetingName: string | null
  functionRole: FunctionRole
  thin?: boolean
}) {
  switch (payload.variant) {
    case 'sales_rep':
      return (
        <RoleDashboardShell
          greetingName={greetingName}
          functionRole={functionRole}
          subtitle={COPY.dashboard.home.salesRep.subtitle}
          ctaLabel={COPY.dashboard.home.salesRep.cta}
          ctaHref={ROUTES.match}
          thin={thin}
          thinBannerText={COPY.dashboard.home.thinBanner}
        >
          <SalesRepDashboard data={payload.data} thin={thin} />
        </RoleDashboardShell>
      )
    case 'account_manager':
      return (
        <RoleDashboardShell
          greetingName={greetingName}
          functionRole={functionRole}
          subtitle={COPY.dashboard.home.accountManager.subtitle}
          ctaLabel={COPY.dashboard.home.accountManager.cta}
          ctaHref={ROUTES.references.new}
          thin={thin}
          thinBannerText={COPY.dashboard.home.thinBanner}
        >
          <AccountManagerDashboard data={payload.data} thin={thin} />
        </RoleDashboardShell>
      )
    case 'sales_leader':
      return (
        <RoleDashboardShell
          greetingName={greetingName}
          functionRole={functionRole}
          subtitle={COPY.dashboard.home.salesLeader.subtitle}
          ctaLabel={COPY.dashboard.home.salesLeader.cta}
          ctaHref={ROUTES.insights}
          thin={thin}
          thinBannerText={COPY.dashboard.home.thinBanner}
        >
          <SalesLeaderDashboard data={payload.data} thin={thin} />
        </RoleDashboardShell>
      )
    case 'generalist':
      return (
        <div className="flex flex-col gap-8">
          <CommandCenter greetingName={greetingName} />
          <GeneralistDashboard data={payload.data} />
        </div>
      )
    default:
      return null
  }
}
