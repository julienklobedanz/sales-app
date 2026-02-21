'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SignInResult = { error?: string; success?: boolean }

export async function signInWithPassword(
  formData: FormData
): Promise<SignInResult> {
  const email = formData.get('email')?.toString()?.trim()
  const password = formData.get('password')?.toString()

  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }
  if (!password) return { error: 'Bitte Passwort eingeben.' }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'E-Mail oder Passwort falsch.' }
    }
    return { error: error.message }
  }

  const inviteToken = formData.get('invite_token')?.toString()?.trim()
  if (inviteToken) {
    redirect(`/onboarding?invite=${encodeURIComponent(inviteToken)}`)
  }
  redirect('/dashboard')
}
