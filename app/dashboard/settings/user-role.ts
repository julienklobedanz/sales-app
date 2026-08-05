'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'

export async function updateUserRoleImpl(roles: {
  systemRole: SystemRole
  functionRole: FunctionRole
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { error } = await supabase
    .from('profiles')
    .update({
      system_role: roles.systemRole,
      function_role: roles.functionRole,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(ROUTES.home)
}
