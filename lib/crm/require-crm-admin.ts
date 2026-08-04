import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/capability-access'

export type CrmAdminContext = {
  supabase: SupabaseClient
  user: User
  organizationId: string
}

export type CrmAdminGuardResult =
  | { ok: true; ctx: CrmAdminContext }
  | { ok: false; error: string; status: number }

/** Nur Workspace-Admins dürfen CRM-Verbindungen verwalten und importieren. */
export async function requireCrmAdmin(): Promise<CrmAdminGuardResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Nicht angemeldet.', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return { ok: false, error: 'Onboarding unvollständig.', status: 403 }
  }

  const { systemRole } = parseProfileRoles(profile)
  if (!isSystemAdmin(systemRole)) {
    return {
      ok: false,
      error: 'Nur Administratoren können CRM-Verbindungen verwalten.',
      status: 403,
    }
  }

  return {
    ok: true,
    ctx: {
      supabase,
      user,
      organizationId: profile.organization_id,
    },
  }
}
