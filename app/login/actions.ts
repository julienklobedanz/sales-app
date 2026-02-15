'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SignInResult = { error?: string; success?: boolean }

export async function signInWithEmail(formData: FormData): Promise<SignInResult> {
  const email = formData.get('email')?.toString()?.trim()
  if (!email) {
    return { error: 'Bitte E-Mail-Adresse eingeben.' }
  }

  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? ''
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const origin = `${proto}://${host}`

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
