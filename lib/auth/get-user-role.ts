import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppRole } from '@/hooks/useRole'
import { legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

/** Abgeleitete Legacy-App-Rolle des angemeldeten Users (Server). */
export async function getSessionAppRole(): Promise<AppRole | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role, capabilities')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return 'sales'

  const { systemRole, functionRole } = parseProfileRoles(profile)
  return legacyAppRoleFrom(systemRole, functionRole)
}
