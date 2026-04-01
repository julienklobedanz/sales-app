'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const role = formData.get('role')?.toString() as 'admin' | 'sales' | undefined
  const avatarDataUrlRaw = formData.get('avatarDataUrl')?.toString() ?? undefined
  const avatarDataUrl =
    avatarDataUrlRaw !== undefined ? avatarDataUrlRaw.trim() || null : undefined

  const updates: Record<string, unknown> = {}

  if (fullName !== undefined && fullName !== '') updates.full_name = fullName
  if (role && (role === 'admin' || role === 'sales')) updates.role = role
  if (avatarDataUrl !== undefined) updates.avatar_url = avatarDataUrl

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.settings)
  return { success: true }
}
