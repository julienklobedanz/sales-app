import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import { isSalesAppView } from '@/lib/roles/reference-access'

/** Sales-Rep-Oberfläche ohne AM/Admin-Rechte. */
export function profileIsSalesRestricted(
  systemRole: SystemRole,
  functionRole: FunctionRole
): boolean {
  return isSalesAppView(systemRole, functionRole)
}

/** Admin oder Account Manager — z. B. NDA, Account-Pflege. */
export function profileCanManageOrgData(
  systemRole: SystemRole,
  functionRole: FunctionRole
): boolean {
  return isSystemAdmin(systemRole) || functionRole === 'account_manager'
}
