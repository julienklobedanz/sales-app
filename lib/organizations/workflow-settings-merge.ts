import type { IcpDefinition } from '@/lib/deals/icp-rubric'
import type { CapabilityProfile } from '@/lib/organizations/capability-profile-types'

export type WorkflowSettingsPatch = {
  capabilityProfile?: CapabilityProfile
  icpDefinition?: IcpDefinition
}

export function mergeWorkflowSettings(
  current: unknown,
  patch: WorkflowSettingsPatch
): Record<string, unknown> {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {}

  if (patch.capabilityProfile !== undefined) {
    base.capabilityProfile = patch.capabilityProfile
  }
  if (patch.icpDefinition !== undefined) {
    base.icpDefinition = patch.icpDefinition
  }

  return base
}
