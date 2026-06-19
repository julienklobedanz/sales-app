import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { hasCapability } from '@/lib/roles/legacy-mapping'

export function canViewInsights(
  functionRole: FunctionRole,
  systemRole: SystemRole,
  capabilityOverrides: Partial<Record<Capability, boolean>> = {}
): boolean {
  return (
    hasCapability(functionRole, systemRole, capabilityOverrides, 'view_analytics_all') ||
    hasCapability(functionRole, systemRole, capabilityOverrides, 'view_analytics_own')
  )
}
