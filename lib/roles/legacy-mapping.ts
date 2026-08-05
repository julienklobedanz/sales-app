import type { AppRole } from '@/lib/roles/types'

import { isSystemAdmin } from '@/lib/roles/capability-access'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'

/** Legacy AppRole aus System- + Funktions-Rolle (konsistent mit DB-Trigger). */
export function legacyAppRoleFrom(
  systemRole: SystemRole,
  functionRole: FunctionRole,
): AppRole {
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

