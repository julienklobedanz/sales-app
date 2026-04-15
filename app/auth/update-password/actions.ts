'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export type UpdatePasswordResult = { error?: string }

export async function updatePasswordAfterReset(
  formData: FormData
): Promise<UpdatePasswordResult> {
  const password = formData.get('password')?.toString()
  const confirm = formData.get('confirm')?.toString()

  if (!password) return { error: 'Bitte neues Passwort eingeben.' }
  if (password.length < 6) {
    return { error: 'Das Passwort muss mindestens 6 Zeichen haben.' }
  }
  if (password !== confirm) {
    return { error: 'Die Passwörter stimmen nicht überein.' }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Sitzung abgelaufen. Bitte fordere einen neuen Link an.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: error.message }
  }

  redirect(ROUTES.home)
}
