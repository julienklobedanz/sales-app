import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { hasCapability, isSystemAdmin } from '@/lib/roles/capability-access'
import {
  getReferenceVisibilityScope,
  type ReferenceVisibilityScope,
} from '@/lib/roles/reference-visibility-scope'
import type { RolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { isReferenceVisibleToSales } from '@/lib/references/sales-reference-visibility'

export function resolveReferenceVisibilityScope(params: {
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilityOverrides?: Partial<Record<Capability, boolean>>
  orgRolesPermissions?: RolesPermissionsSettings | null
}): ReferenceVisibilityScope {
  return getReferenceVisibilityScope(params)
}

/** Defense-in-Depth: Status-Filter analog zum App-Gate / match_references. */
export function isReferenceStatusAccessibleToUser(
  status: string | null | undefined,
  scope: ReferenceVisibilityScope,
): boolean {
  if (!scope.restrictToSalesVisibleStatuses) return true
  return isReferenceVisibleToSales(status)
}

export function userCanCreateReference(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  capabilityOverrides: Partial<Record<Capability, boolean>> = {},
): boolean {
  return hasCapability(functionRole, systemRole, capabilityOverrides, 'create_reference')
}

export function userCanEditReference(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  capabilityOverrides: Partial<Record<Capability, boolean>> = {},
): boolean {
  return (
    hasCapability(functionRole, systemRole, capabilityOverrides, 'edit_any_reference') ||
    hasCapability(functionRole, systemRole, capabilityOverrides, 'create_reference')
  )
}

export function userCanAnonymizeReference(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  capabilityOverrides: Partial<Record<Capability, boolean>> = {},
): boolean {
  return hasCapability(
    functionRole,
    systemRole,
    capabilityOverrides,
    'anonymize_reference',
  )
}

/** Vertriebs-UI-Layout (Legacy `sales` ohne DB-Spalten-Vergleich). */
export function isSalesAppView(
  systemRole: SystemRole,
  functionRole: FunctionRole,
): boolean {
  return !isSystemAdmin(systemRole) && functionRole !== 'account_manager'
}

export function canApproveInternalReference(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  capabilityOverrides: Partial<Record<Capability, boolean>> = {},
): boolean {
  return hasCapability(functionRole, systemRole, capabilityOverrides, 'approve_internal')
}

export function canManageReferencesAsAdmin(systemRole: SystemRole): boolean {
  return isSystemAdmin(systemRole)
}
