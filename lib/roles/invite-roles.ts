import { COPY } from '@/lib/copy'

import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'

const SYSTEM_ROLES = new Set<SystemRole>(['owner', 'admin', 'member', 'viewer'])
const FUNCTION_ROLES = new Set<FunctionRole>([
  'sales_rep',
  'account_manager',
  'sales_leader',
])

export type InviteRoleDimensions = {
  systemRole: SystemRole
  functionRole: FunctionRole
}

export const DEFAULT_INVITE_ROLES: InviteRoleDimensions = {
  systemRole: 'member',
  functionRole: 'sales_rep',
}

/** System-Rollen im Einladungs-UI (viewer ausgeschlossen). */
export const INVITE_SYSTEM_ROLE_OPTIONS: SystemRole[] = ['owner', 'admin', 'member']

export const INVITE_FUNCTION_ROLE_OPTIONS: FunctionRole[] = [
  'sales_rep',
  'account_manager',
  'sales_leader',
]

function asSystemRole(value: unknown): SystemRole | null {
  const s = typeof value === 'string' ? value : null
  return s && SYSTEM_ROLES.has(s as SystemRole) ? (s as SystemRole) : null
}

function asFunctionRole(value: unknown): FunctionRole | null {
  const s = typeof value === 'string' ? value : null
  return s && FUNCTION_ROLES.has(s as FunctionRole) ? (s as FunctionRole) : null
}

export function parseInviteRoleDimensions(row: {
  system_role?: string | null
  function_role?: string | null
}): InviteRoleDimensions {
  const systemRole = asSystemRole(row.system_role)
  const functionRole = asFunctionRole(row.function_role)
  if (systemRole && functionRole) {
    return { systemRole, functionRole }
  }
  return DEFAULT_INVITE_ROLES
}

export function formatRoleDimensionsLabel(
  systemRole: SystemRole,
  functionRole: FunctionRole,
): string {
  const system = COPY.roleDimensions.systemRoles[systemRole] ?? systemRole
  const fn = COPY.roleDimensions.functionRoles[functionRole] ?? functionRole
  return `${system} · ${fn}`
}
