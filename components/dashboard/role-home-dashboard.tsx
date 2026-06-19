'use client'

import type {
  AccountManagerDashboardModel,
  AdminDashboardModel,
  GeneralistDashboardModel,
  SalesRepDashboardModel,
} from '@/app/dashboard/dashboard-home-data'
import { AccountManagerDashboard } from '@/components/dashboard/account-manager-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { CommandCenter } from '@/components/dashboard/command-center'
import { GeneralistDashboard } from '@/components/dashboard/generalist-dashboard'
import { SalesRepDashboard } from '@/components/dashboard/sales-rep-dashboard'
import type { FunctionRole } from '@/lib/roles/capabilities'

export type RoleHomeDashboardPayload =
  | { variant: 'sales_rep'; data: SalesRepDashboardModel }
  | { variant: 'account_manager'; data: AccountManagerDashboardModel }
  | { variant: 'sales_leader'; data: AdminDashboardModel }
  | { variant: 'generalist'; data: GeneralistDashboardModel }

export function RoleHomeDashboard({
  payload,
  greetingName,
  functionRole,
}: {
  payload: RoleHomeDashboardPayload
  greetingName: string | null
  functionRole: FunctionRole
}) {
  switch (payload.variant) {
    case 'sales_rep':
      return (
        <div className="flex flex-col gap-8">
          <CommandCenter greetingName={greetingName} />
          <SalesRepDashboard data={payload.data} />
        </div>
      )
    case 'account_manager':
      return <AccountManagerDashboard data={payload.data} />
    case 'sales_leader':
      return <AdminDashboard data={payload.data} variant="sales_leader" />
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
