'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SignInResult = { error?: string; success?: boolean }

export async function signInWithEmail(formData: FormData): Promise<SignInResult> {
  const email = formData.get('email')?.toString()?.trim()
  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }

  // Origin säubern (Slash am Ende entfernen)
  let origin = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')

  if (!origin.startsWith('http')) {
    origin = `https://${origin}`
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Sicherer Pfad ohne Risiko von doppelten Slashes
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return { success: true }
}
