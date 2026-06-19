import type { AppRole } from '@/lib/roles/types'

import {
  ADMIN_CAPS,
  FUNCTION_ROLE_CAPS,
  type Capability,
  type FunctionRole,
  type SystemRole,
} from '@/lib/roles/capabilities'

export function isSystemAdmin(systemRole: SystemRole): boolean {
  return systemRole === 'owner' || systemRole === 'admin'
}

/** Legacy AppRole aus System- + Funktions-Rolle (konsistent mit DB-Trigger). */
export function legacyAppRoleFrom(systemRole: SystemRole, functionRole: FunctionRole): AppRole {
  if (functionRole === 'account_manager') return 'account_manager'
  if (isSystemAdmin(systemRole)) return 'admin'
  return 'sales'
}

export function legacyRoleToDimensions(legacyRole: string | null | undefined): {
  systemRole: SystemRole
  functionRole: FunctionRole
} {
  const r = legacyRole ?? 'sales'
  if (r === 'admin') {
    return { systemRole: 'admin', functionRole: 'sales_leader' }
  }
  if (r === 'account_manager') {
    return { systemRole: 'member', functionRole: 'account_manager' }
  }
  return { systemRole: 'member', functionRole: 'sales_rep' }
}

export function effectiveCapabilities(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  overrides: Partial<Record<Capability, boolean>> = {}
): Set<Capability> {
  const caps = new Set<Capability>(FUNCTION_ROLE_CAPS[functionRole])
  if (isSystemAdmin(systemRole)) {
    for (const cap of ADMIN_CAPS) caps.add(cap)
  }
  for (const [key, value] of Object.entries(overrides)) {
    const cap = key as Capability
    if (value === true) caps.add(cap)
    if (value === false) caps.delete(cap)
  }
  return caps
}

export function hasCapability(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  overrides: Partial<Record<Capability, boolean>>,
  cap: Capability
): boolean {
  return effectiveCapabilities(functionRole, systemRole, overrides).has(cap)
}

const ADMIN_APP_ROLE: AppRole = 'admin'
const SALES_APP_ROLE: AppRole = 'sales'
const ACCOUNT_MANAGER_APP_ROLE: AppRole = 'account_manager'

export const LEGACY_INVITE_APP_ROLES: readonly AppRole[] = [
  ADMIN_APP_ROLE,
  SALES_APP_ROLE,
  ACCOUNT_MANAGER_APP_ROLE,
]

export function appRoleIsAdmin(role: AppRole): boolean {
  return role === ADMIN_APP_ROLE
}

export function appRoleIsSales(role: AppRole): boolean {
  return role === SALES_APP_ROLE
}

export function appRoleIsAccountManager(role: AppRole): boolean {
  return role === ACCOUNT_MANAGER_APP_ROLE
}

export function appRoleCanManageOrg(role: AppRole): boolean {
  return appRoleIsAdmin(role) || appRoleIsAccountManager(role)
}

export function commandCenterSuggestionsBranch(role: AppRole): 'admin' | 'account_manager' | 'sales' {
  if (appRoleIsAdmin(role)) return 'admin'
  if (appRoleIsAccountManager(role)) return 'account_manager'
  return 'sales'
}
