'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export type SignInResult = { error?: string; success?: boolean }

function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-.*-auth-token(?:\.\d+)?$/.test(name)
}

async function convertSupabaseAuthCookiesToSessionCookies() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const secure = process.env.NODE_ENV === 'production'

  // Ohne maxAge/expires bleiben diese Cookies nur bis zum Browser-Schließen erhalten.
  for (const cookie of allCookies) {
    if (!isSupabaseAuthCookie(cookie.name)) continue
    cookieStore.set(cookie.name, cookie.value, {
      path: '/',
      sameSite: 'lax',
      secure,
    })
  }
}

export async function signInWithPassword(
  formData: FormData
): Promise<SignInResult> {
  const email = formData.get('email')?.toString()?.trim()
  const password = formData.get('password')?.toString()
  const remember = formData.get('remember') === 'on'

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

  if (!remember) {
    await convertSupabaseAuthCookiesToSessionCookies()
  }

  const inviteToken = formData.get('invite_token')?.toString()?.trim()
  if (inviteToken) {
    redirect(`${ROUTES.onboarding}?invite=${encodeURIComponent(inviteToken)}`)
  }
  redirect(ROUTES.home)
}
