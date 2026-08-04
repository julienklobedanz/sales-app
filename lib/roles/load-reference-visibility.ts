import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getRequestProfile,
  getRequestUser,
  REQUEST_PROFILE_SELECT,
  type RequestProfile,
} from '@/lib/auth/request-user'
import { getReferenceVisibilityScope } from '@/lib/roles/reference-visibility-scope'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { parseRolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'

export async function loadReferenceVisibilityForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  organizationId: string
  salesVisibleOnly: boolean
} | null> {
  const requestUser = await getRequestUser()
  let profile: RequestProfile | null = null

  if (requestUser?.id === userId) {
    profile = await getRequestProfile()
  } else {
    const { data } = await supabase
      .from('profiles')
      .select(REQUEST_PROFILE_SELECT)
      .eq('id', userId)
      .single()
    profile = data
  }

  if (!profile?.organization_id) return null

  const roles = parseProfileRoles(profile)
  let orgRolesPermissions = null
  const { data: org } = await supabase
    .from('organizations')
    .select('api_settings')
    .eq('id', profile.organization_id)
    .maybeSingle()

  if (org?.api_settings && typeof org.api_settings === 'object') {
    const api = org.api_settings as Record<string, unknown>
    orgRolesPermissions = parseRolesPermissionsSettings(api.roles_permissions)
  }

  const scope = getReferenceVisibilityScope({
    systemRole: roles.systemRole,
    functionRole: roles.functionRole,
    capabilityOverrides: roles.capabilities,
    orgRolesPermissions,
  })

  return {
    organizationId: profile.organization_id as string,
    salesVisibleOnly: scope.restrictToSalesVisibleStatuses,
  }
}
