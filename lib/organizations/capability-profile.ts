import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  parseOrgCapabilitySettings,
  type OrgCapabilitySettings,
} from '@/lib/organizations/capability-profile-types'

export type { CapabilityProfile, OrgCapabilitySettings } from '@/lib/organizations/capability-profile-types'
export {
  parseCapabilityProfile,
  parseOrgCapabilitySettings,
} from '@/lib/organizations/capability-profile-types'

export async function loadOrgCapabilitySettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgCapabilitySettings> {
  const { data, error } = await supabase
    .from('organizations')
    .select('workflow_settings')
    .eq('id', organizationId)
    .maybeSingle()

  if (error) {
    console.error('loadOrgCapabilitySettings:', error.message)
    return { capabilityProfile: {}, icpDefinition: {} }
  }

  return parseOrgCapabilitySettings(data?.workflow_settings)
}

export async function loadOrgReferenceCount(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('references')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) {
    console.error('loadOrgReferenceCount:', error.message)
    return 0
  }
  return count ?? 0
}
