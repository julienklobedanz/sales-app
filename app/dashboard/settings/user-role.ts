'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { legacyRoleToDimensions } from '@/lib/roles/legacy-mapping'
import type { AppRole } from '@/lib/roles/types'

/** Profil-Rolle: nur noch system_role + function_role (UI nutzt weiter Legacy-Labels admin/sales). */
export async function updateUserRoleImpl(legacyRole: Extract<AppRole, 'admin' | 'sales'>) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const dims = legacyRoleToDimensions(legacyRole)

  const { error } = await supabase
    .from('profiles')
    .update({
      system_role: dims.systemRole,
      function_role: dims.functionRole,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(ROUTES.home)
}
