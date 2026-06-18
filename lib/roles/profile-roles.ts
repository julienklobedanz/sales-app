import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { legacyRoleToDimensions } from '@/lib/roles/legacy-mapping'

const SYSTEM_ROLES = new Set<SystemRole>(['owner', 'admin', 'member', 'viewer'])
const FUNCTION_ROLES = new Set<FunctionRole>(['sales_rep', 'account_manager', 'sales_leader'])

function asSystemRole(value: unknown): SystemRole | null {
  const s = typeof value === 'string' ? value : null
  return s && SYSTEM_ROLES.has(s as SystemRole) ? (s as SystemRole) : null
}

function asFunctionRole(value: unknown): FunctionRole | null {
  const s = typeof value === 'string' ? value : null
  return s && FUNCTION_ROLES.has(s as FunctionRole) ? (s as FunctionRole) : null
}

export function parseCapabilitiesOverrides(raw: unknown): Partial<Record<Capability, boolean>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Partial<Record<Capability, boolean>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') {
      out[key as Capability] = value
    }
  }
  return out
}

export function parseProfileRoles(profile: {
  role?: string | null
  system_role?: string | null
  function_role?: string | null
  capabilities?: unknown
}): {
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities: Partial<Record<Capability, boolean>>
} {
  const fromLegacy = legacyRoleToDimensions(profile.role)
  const systemRole = asSystemRole(profile.system_role) ?? fromLegacy.systemRole
  const functionRole = asFunctionRole(profile.function_role) ?? fromLegacy.functionRole
  return {
    systemRole,
    functionRole,
    capabilities: parseCapabilitiesOverrides(profile.capabilities),
  }
}
