import {
  ADMIN_CAPS,
  CAPABILITIES,
  FUNCTION_ROLE_CAPS,
  type Capability,
  type FunctionRole,
} from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'

export type ApprovalRoutingMode = 'am_direct' | 'via_rpm' | 'legal_gate_on_nda'

export const ROLES_PERMISSIONS_VISIBILITY_CAPABILITIES = [
  'see_draft_references',
  'see_confidential_references',
] as const satisfies readonly Capability[]

export type RolesPermissionsVisibilityCapability =
  (typeof ROLES_PERMISSIONS_VISIBILITY_CAPABILITIES)[number]

const VISIBILITY_CAPABILITY_SET = new Set<string>(ROLES_PERMISSIONS_VISIBILITY_CAPABILITIES)

export function isVisibilityCapability(
  cap: Capability
): cap is RolesPermissionsVisibilityCapability {
  return VISIBILITY_CAPABILITY_SET.has(cap)
}

export function defaultVisibilityCapabilityMatrix(): Record<FunctionRole, Capability[]> {
  return {
    sales_rep: FUNCTION_ROLE_CAPS.sales_rep.filter(isVisibilityCapability),
    account_manager: FUNCTION_ROLE_CAPS.account_manager.filter(isVisibilityCapability),
    sales_leader: FUNCTION_ROLE_CAPS.sales_leader.filter(isVisibilityCapability),
  }
}

export type RolesPermissionsSettings = {
  sales_sees_drafts?: boolean
  function_role_capabilities?: Partial<Record<FunctionRole, Capability[]>>
  active_function_roles?: FunctionRole[]
  approval_routing?: {
    mode: ApprovalRoutingMode
  }
  sensitivity_labels?: {
    draft?: string
    nda?: string
    confidential_sales?: string
  }
}

const CAPABILITY_SET = new Set<string>(CAPABILITIES)
const FUNCTION_ROLES: FunctionRole[] = ['sales_rep', 'account_manager', 'sales_leader']
const APPROVAL_MODES = new Set<ApprovalRoutingMode>([
  'am_direct',
  'via_rpm',
  'legal_gate_on_nda',
])

function asCapability(value: unknown): Capability | null {
  const s = typeof value === 'string' ? value : null
  return s && CAPABILITY_SET.has(s) ? (s as Capability) : null
}

function parseCapabilityArray(raw: unknown): Capability[] | null {
  if (!Array.isArray(raw)) return null
  const out: Capability[] = []
  for (const item of raw) {
    const cap = asCapability(item)
    if (cap) out.push(cap)
  }
  return out
}

export function defaultRolesPermissionsSettings(): RolesPermissionsSettings {
  return {}
}

export function parseRolesPermissionsSettings(raw: unknown): RolesPermissionsSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaultRolesPermissionsSettings()
  }
  const obj = raw as Record<string, unknown>

  const functionRoleCapabilities: Partial<Record<FunctionRole, Capability[]>> = {}
  const frRaw = obj.function_role_capabilities
  if (frRaw && typeof frRaw === 'object' && !Array.isArray(frRaw)) {
    for (const role of FUNCTION_ROLES) {
      const caps = parseCapabilityArray((frRaw as Record<string, unknown>)[role])
      if (caps) functionRoleCapabilities[role] = caps
    }
  }

  const activeRoles: FunctionRole[] = []
  if (Array.isArray(obj.active_function_roles)) {
    for (const item of obj.active_function_roles) {
      if (item === 'sales_rep' || item === 'account_manager' || item === 'sales_leader') {
        activeRoles.push(item)
      }
    }
  }

  const routingRaw = obj.approval_routing
  let approvalRouting: RolesPermissionsSettings['approval_routing']
  if (routingRaw && typeof routingRaw === 'object' && !Array.isArray(routingRaw)) {
    const mode = (routingRaw as { mode?: unknown }).mode
    if (typeof mode === 'string' && APPROVAL_MODES.has(mode as ApprovalRoutingMode)) {
      approvalRouting = { mode: mode as ApprovalRoutingMode }
    }
  }

  const labelsRaw = obj.sensitivity_labels
  let sensitivityLabels: RolesPermissionsSettings['sensitivity_labels']
  if (labelsRaw && typeof labelsRaw === 'object' && !Array.isArray(labelsRaw)) {
    const l = labelsRaw as Record<string, unknown>
    sensitivityLabels = {
      draft: typeof l.draft === 'string' ? l.draft.slice(0, 120) : undefined,
      nda: typeof l.nda === 'string' ? l.nda.slice(0, 120) : undefined,
      confidential_sales:
        typeof l.confidential_sales === 'string' ? l.confidential_sales.slice(0, 120) : undefined,
    }
  }

  return {
    sales_sees_drafts:
      typeof obj.sales_sees_drafts === 'boolean' ? obj.sales_sees_drafts : undefined,
    function_role_capabilities:
      Object.keys(functionRoleCapabilities).length > 0 ? functionRoleCapabilities : undefined,
    active_function_roles: activeRoles.length > 0 ? activeRoles : undefined,
    approval_routing: approvalRouting,
    sensitivity_labels: sensitivityLabels,
  }
}

export function serializeRolesPermissionsSettings(
  settings: RolesPermissionsSettings
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (typeof settings.sales_sees_drafts === 'boolean') {
    out.sales_sees_drafts = settings.sales_sees_drafts
  }
  if (settings.function_role_capabilities) {
    out.function_role_capabilities = settings.function_role_capabilities
  }
  if (settings.active_function_roles?.length) {
    out.active_function_roles = settings.active_function_roles
  }
  if (settings.approval_routing) {
    out.approval_routing = settings.approval_routing
  }
  if (settings.sensitivity_labels) {
    out.sensitivity_labels = settings.sensitivity_labels
  }
  return out
}

/** Effektive Capabilities inkl. org-weiter Defaults (Spiegel der SQL-Helfer). */
export function effectiveCapabilitiesWithOrg(
  functionRole: FunctionRole,
  systemRole: Parameters<typeof isSystemAdmin>[0],
  overrides: Partial<Record<Capability, boolean>>,
  orgSettings: RolesPermissionsSettings | null | undefined
): Set<Capability> {
  const orgCaps = orgSettings?.function_role_capabilities?.[functionRole]
  const baseList = orgCaps ?? FUNCTION_ROLE_CAPS[functionRole]
  const caps = new Set<Capability>(baseList)

  if (
    functionRole === 'sales_rep' &&
    orgSettings?.sales_sees_drafts === true
  ) {
    caps.add('see_draft_references')
  }

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

export function hasEffectiveCapability(
  functionRole: FunctionRole,
  systemRole: Parameters<typeof isSystemAdmin>[0],
  overrides: Partial<Record<Capability, boolean>>,
  cap: Capability,
  orgSettings?: RolesPermissionsSettings | null
): boolean {
  return effectiveCapabilitiesWithOrg(functionRole, systemRole, overrides, orgSettings).has(cap)
}
