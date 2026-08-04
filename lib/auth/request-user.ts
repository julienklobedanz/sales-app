import { cache } from 'react'
import { cookies } from 'next/headers'

import type { AppRole } from '@/hooks/useRole'
import {
  DEV_ROLE_COOKIE,
  canUseDevRolePreview,
  parseDevRolePreviewCookie,
} from '@/lib/dev-role-preview'
import { log } from '@/lib/observability/logger'
import { legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import type { Tables } from '@/lib/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { safeAuthGetUser } from '@/lib/supabase/safe-auth'

export const REQUEST_PROFILE_SELECT =
  'organization_id, system_role, function_role, capabilities, full_name' as const

export type RequestProfile = Pick<
  Tables<'profiles'>,
  'organization_id' | 'system_role' | 'function_role' | 'capabilities' | 'full_name'
>

/** Verifiziertes Auth pro Request (React cache — ein Roundtrip pro Render). */
export const getRequestUser = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const user = await safeAuthGetUser(supabase)
  log.info('auth.getUser', {
    action: 'getRequestUser',
    source: 'fetch',
    hasUser: Boolean(user),
  })
  return user
})

/** Profil-Read pro Request (React cache — ein Roundtrip pro Render). */
export const getRequestProfile = cache(async (): Promise<RequestProfile | null> => {
  const user = await getRequestUser()
  if (!user) return null

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select(REQUEST_PROFILE_SELECT)
    .eq('id', user.id)
    .single()

  log.info('auth.profile', {
    action: 'getRequestProfile',
    source: 'fetch',
    userId: user.id,
  })
  return data
})

export type RequestEffectiveRoles = {
  profile: RequestProfile
  systemRole: ReturnType<typeof parseProfileRoles>['systemRole']
  functionRole: ReturnType<typeof parseProfileRoles>['functionRole']
  capabilities: ReturnType<typeof parseProfileRoles>['capabilities']
  effectiveRole: AppRole
}

/** Profil + effektive Rollen (inkl. Dev-Role-Preview) pro Request. */
export const getRequestEffectiveRoles = cache(
  async (): Promise<RequestEffectiveRoles | null> => {
    const profile = await getRequestProfile()
    if (!profile) return null

    const serverRoles = parseProfileRoles(profile)
    const cookieStore = await cookies()
    const previewRoles = canUseDevRolePreview(serverRoles.systemRole)
      ? parseDevRolePreviewCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
      : null

    const systemRole = previewRoles?.systemRole ?? serverRoles.systemRole
    const functionRole = previewRoles?.functionRole ?? serverRoles.functionRole

    return {
      profile,
      systemRole,
      functionRole,
      capabilities: serverRoles.capabilities,
      effectiveRole: legacyAppRoleFrom(systemRole, functionRole),
    }
  },
)
