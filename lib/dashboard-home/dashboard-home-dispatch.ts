import type { SupabaseClient } from '@supabase/supabase-js'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { log } from '@/lib/observability/logger'
import { withTiming } from '@/lib/observability/timing'
import { loadAccountManagerDashboardData } from '@/lib/dashboard-home/dashboard-home-account-manager'
import { loadAdminDashboardData } from '@/lib/dashboard-home/dashboard-home-admin'
import { loadGeneralistDashboardData } from '@/lib/dashboard-home/dashboard-home-generalist'
import { loadSalesRepDashboardData } from '@/lib/dashboard-home/dashboard-home-sales-rep'
import type {
  AccountManagerDashboardModel,
  AdminDashboardModel,
  GeneralistDashboardModel,
  SalesRepDashboardModel,
} from '@/lib/dashboard-home/dashboard-home-types'

export type DashboardHomePayload =
  | { variant: 'sales_rep'; data: SalesRepDashboardModel }
  | { variant: 'account_manager'; data: AccountManagerDashboardModel }
  | { variant: 'sales_leader'; data: AdminDashboardModel }
  | { variant: 'generalist'; data: GeneralistDashboardModel }

/** Wählt das Home-Dashboard anhand der Funktions-Rolle (nicht Legacy-`role`). */
async function loadDashboardHomeForFunctionRoleInner(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  organizationId: string | undefined
): Promise<DashboardHomePayload> {
  if (systemRole === 'viewer') {
    return {
      variant: 'generalist',
      data: await loadGeneralistDashboardData(supabase, userId, fullName, organizationId),
    }
  }
  if (functionRole === 'account_manager') {
    return {
      variant: 'account_manager',
      data: await loadAccountManagerDashboardData(supabase, userId, fullName, organizationId),
    }
  }
  if (functionRole === 'sales_leader') {
    return {
      variant: 'sales_leader',
      data: await loadAdminDashboardData(supabase, fullName, organizationId),
    }
  }
  if (functionRole === 'sales_rep') {
    return {
      variant: 'sales_rep',
      data: await loadSalesRepDashboardData(supabase, userId, fullName, organizationId),
    }
  }
  return {
    variant: 'generalist',
    data: await loadGeneralistDashboardData(supabase, userId, fullName, organizationId),
  }
}

/** @deprecated Nutze `loadDashboardHomeForFunctionRole`. */
export async function loadDashboardHomeForRole(
  systemRole: SystemRole,
  functionRole: FunctionRole,
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  organizationId?: string
): Promise<DashboardHomePayload> {
  return loadDashboardHomeForFunctionRole(
    functionRole,
    systemRole,
    supabase,
    userId,
    fullName,
    organizationId
  )
}

export async function loadDashboardHomeForFunctionRole(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  organizationId?: string
): Promise<DashboardHomePayload> {
  const timingLabel =
    systemRole === 'viewer'
      ? 'dashboard.home.generalist'
      : functionRole === 'account_manager'
        ? 'dashboard.home.account_manager'
        : functionRole === 'sales_leader'
          ? 'dashboard.home.sales_leader'
          : functionRole === 'sales_rep'
            ? 'dashboard.home.sales_rep'
            : 'dashboard.home.generalist'

  try {
    const { result } = await withTiming(
      timingLabel,
      () =>
        loadDashboardHomeForFunctionRoleInner(
          functionRole,
          systemRole,
          supabase,
          userId,
          fullName,
          organizationId
        ),
      { organizationId, userId, functionRole, systemRole }
    )
    return result
  } catch (error) {
    log.error('dashboard home load failed', { action: 'loadDashboardHomeForFunctionRole', userId, functionRole, systemRole }, error)
    throw error
  }
}

