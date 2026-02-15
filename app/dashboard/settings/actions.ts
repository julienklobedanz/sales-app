'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const fullName = formData.get('fullName')?.toString()?.trim()
  const role = formData.get('role')?.toString() as 'admin' | 'sales' | undefined

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  }

  if (fullName !== undefined && fullName !== '') updates.full_name = fullName
  if (role && (role === 'admin' || role === 'sales')) updates.role = role

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}
