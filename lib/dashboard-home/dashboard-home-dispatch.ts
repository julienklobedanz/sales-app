import type { SupabaseClient } from '@supabase/supabase-js'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { log } from '@/lib/observability/logger'
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
  fullName: string | null
): Promise<DashboardHomePayload> {
  if (systemRole === 'viewer') {
    return {
      variant: 'generalist',
      data: await loadGeneralistDashboardData(supabase, userId, fullName),
    }
  }
  if (functionRole === 'account_manager') {
    return {
      variant: 'account_manager',
      data: await loadAccountManagerDashboardData(supabase, userId, fullName),
    }
  }
  if (functionRole === 'sales_leader') {
    return {
      variant: 'sales_leader',
      data: await loadAdminDashboardData(supabase, fullName),
    }
  }
  if (functionRole === 'sales_rep') {
    return {
      variant: 'sales_rep',
      data: await loadSalesRepDashboardData(supabase, userId, fullName),
    }
  }
  return {
    variant: 'generalist',
    data: await loadGeneralistDashboardData(supabase, userId, fullName),
  }
}

/** @deprecated Nutze `loadDashboardHomeForFunctionRole`. */
export async function loadDashboardHomeForRole(
  systemRole: SystemRole,
  functionRole: FunctionRole,
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null
): Promise<DashboardHomePayload> {
  return loadDashboardHomeForFunctionRole(functionRole, systemRole, supabase, userId, fullName)
}

export async function loadDashboardHomeForFunctionRole(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null
): Promise<DashboardHomePayload> {
  try {
    return await loadDashboardHomeForFunctionRoleInner(functionRole, systemRole, supabase, userId, fullName)
  } catch (error) {
    log.error('dashboard home load failed', { action: 'loadDashboardHomeForFunctionRole', userId, functionRole, systemRole }, error)
    throw error
  }
}

