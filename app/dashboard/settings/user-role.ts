'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function updateUserRoleImpl(role: 'admin' | 'sales') {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

