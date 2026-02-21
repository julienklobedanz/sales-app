'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SignUpResult = { error?: string; success?: boolean }

export async function signUp(formData: FormData): Promise<SignUpResult> {
  const email = formData.get('email')?.toString()?.trim()
  const password = formData.get('password')?.toString()

  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }
  if (!password) return { error: 'Bitte Passwort eingeben.' }
  if (password.length < 6) {
    return { error: 'Das Passwort muss mindestens 6 Zeichen haben.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Diese E-Mail ist bereits registriert. Melde dich an.' }
    }
    return { error: error.message }
  }

  // Mit E-Mail-Bestätigung: oft keine Session bis Bestätigung → Erfolg anzeigen
  // Ohne Bestätigung: Session wird gesetzt → direkt zum Dashboard
  if (data.session) {
    redirect('/dashboard')
  }

  return { success: true }
}
