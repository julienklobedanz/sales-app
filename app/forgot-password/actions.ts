'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export type ForgotPasswordResult = { error?: string; success?: boolean }

function appOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || ''
  if (!raw) return null
  return raw.startsWith('http') ? raw : `https://${raw}`
}

export async function sendPasswordResetEmail(
  formData: FormData
): Promise<ForgotPasswordResult> {
  const email = formData.get('email')?.toString()?.trim()
  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }

  const base = appOrigin()
  if (!base) {
    return { error: 'App-URL (NEXT_PUBLIC_APP_URL) ist nicht konfiguriert.' }
  }

  const next = encodeURIComponent(ROUTES.authUpdatePassword)
  const redirectTo = `${base}/auth/callback?next=${next}`

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
