'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SignInResult = { error?: string; success?: boolean }

export async function signInWithEmail(formData: FormData): Promise<SignInResult> {
  const email = formData.get('email')?.toString()?.trim()
  if (!email) {
    return { error: 'Bitte E-Mail-Adresse eingeben.' }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
