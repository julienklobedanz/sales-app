import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import {
  hasEffectiveCapability,
  type RolesPermissionsSettings,
} from '@/lib/roles/roles-permissions-settings'

/** Stati, die in match_references bei p_sales_visible_only=true sichtbar sind (≙ RLS-Tier „freigegeben/intern“). */
export const RPC_SALES_VISIBLE_REFERENCE_STATUSES = [
  'approved',
  'internal_only',
  'anonymized',
  'external',
] as const

export type ReferenceVisibilityScope = {
  /** Entspricht match_references(p_sales_visible_only). */
  restrictToSalesVisibleStatuses: boolean
  salesVisibleStatuses: readonly string[]
}

export function getReferenceVisibilityScope(params: {
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilityOverrides?: Partial<Record<Capability, boolean>>
  orgRolesPermissions?: RolesPermissionsSettings | null
}): ReferenceVisibilityScope {
  const overrides = params.capabilityOverrides ?? {}
  const org = params.orgRolesPermissions

  if (isSystemAdmin(params.systemRole)) {
    return unrestrictedScope()
  }

  const canSeeDrafts = hasEffectiveCapability(
    params.functionRole,
    params.systemRole,
    overrides,
    'see_draft_references',
    org
  )
  const canSeeConfidential = hasEffectiveCapability(
    params.functionRole,
    params.systemRole,
    overrides,
    'see_confidential_references',
    org
  )

  const restrictToSalesVisibleStatuses = !(canSeeDrafts || canSeeConfidential)

  return {
    restrictToSalesVisibleStatuses,
    salesVisibleStatuses: RPC_SALES_VISIBLE_REFERENCE_STATUSES,
  }
}

function unrestrictedScope(): ReferenceVisibilityScope {
  return {
    restrictToSalesVisibleStatuses: false,
    salesVisibleStatuses: RPC_SALES_VISIBLE_REFERENCE_STATUSES,
  }
}
