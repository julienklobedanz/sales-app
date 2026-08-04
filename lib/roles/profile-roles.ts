import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'

const SYSTEM_ROLES = new Set<SystemRole>(['owner', 'admin', 'member', 'viewer'])
const FUNCTION_ROLES = new Set<FunctionRole>([
  'sales_rep',
  'account_manager',
  'sales_leader',
])

function asSystemRole(value: unknown): SystemRole | null {
  const s = typeof value === 'string' ? value : null
  return s && SYSTEM_ROLES.has(s as SystemRole) ? (s as SystemRole) : null
}

function asFunctionRole(value: unknown): FunctionRole | null {
  const s = typeof value === 'string' ? value : null
  return s && FUNCTION_ROLES.has(s as FunctionRole) ? (s as FunctionRole) : null
}

export function parseCapabilitiesOverrides(
  raw: unknown,
): Partial<Record<Capability, boolean>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Partial<Record<Capability, boolean>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') {
      out[key as Capability] = value
    }
  }
  return out
}

export function parseProfileRoles(
  profile:
    | {
        system_role?: string | null
        function_role?: string | null
        capabilities?: unknown
      }
    | null
    | undefined,
): {
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities: Partial<Record<Capability, boolean>>
} {
  const systemRole = asSystemRole(profile?.system_role) ?? 'member'
  const functionRole = asFunctionRole(profile?.function_role) ?? 'sales_rep'
  return {
    systemRole,
    functionRole,
    capabilities: parseCapabilitiesOverrides(profile?.capabilities),
  }
}
