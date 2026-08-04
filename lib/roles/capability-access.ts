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

export function effectiveCapabilities(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  overrides: Partial<Record<Capability, boolean>> = {},
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
  cap: Capability,
): boolean {
  return effectiveCapabilities(functionRole, systemRole, overrides).has(cap)
}
