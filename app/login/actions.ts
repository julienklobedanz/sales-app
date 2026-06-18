'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  buildAuthCallbackUrl,
  normalizeSsoDomain,
  resolvePostAuthPath,
} from '@/lib/auth/auth-redirect'
import { sendMagicLinkEmailViaResend } from '@/lib/auth/send-magic-link-email'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export type SignInResult = { error?: string; success?: boolean }
export type AltSignInResult = { error?: string; success?: string; redirectUrl?: string }

function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-.*-auth-token(?:\.\d+)?$/.test(name)
}

async function applySupabaseAuthCookieLifetime(remember: boolean) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const secure = process.env.NODE_ENV === 'production'
  const maxAge = remember ? 60 * 60 * 24 * 30 : undefined

  // remember=true: persistente Login-Cookies (30 Tage)
  // remember=false: Session-Cookies (bis Browser-Schließen)
  for (const cookie of allCookies) {
    if (!isSupabaseAuthCookie(cookie.name)) continue
    cookieStore.set(cookie.name, cookie.value, {
      path: '/',
      sameSite: 'lax',
      secure,
      httpOnly: true,
      ...(typeof maxAge === 'number' ? { maxAge } : {}),
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

  await applySupabaseAuthCookieLifetime(remember)

  const inviteToken = formData.get('invite_token')?.toString()?.trim()
  if (inviteToken) {
    redirect(`${ROUTES.onboarding}?invite=${encodeURIComponent(inviteToken)}`)
  }
  redirect(ROUTES.home)
}

export async function sendMagicLinkSignIn(formData: FormData): Promise<AltSignInResult> {
  const email = formData.get('email')?.toString()?.trim()
  const inviteToken = formData.get('invite_token')?.toString()?.trim() || null

  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }

  const next = resolvePostAuthPath(inviteToken)
  const emailRedirectTo = buildAuthCallbackUrl(next)
  const successMessage =
    'Wir haben dir einen Anmelde-Link gesendet. Bitte prüfe dein Postfach (auch den Spam-Ordner).'

  const supabase = await createServerSupabaseClient()

  // Invite: Nutzer existiert ggf. noch nicht → OTP mit Account-Erstellung.
  if (inviteToken) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    })
    if (error) return { error: error.message }
    return { success: successMessage }
  }

  // Bestehende Konten: bevorzugt Resend (wie Registrierungs-Bestätigung).
  const resendResult = await sendMagicLinkEmailViaResend({
    email,
    redirectTo: emailRedirectTo,
    inviteToken,
  })

  if (resendResult.ok) {
    return { success: successMessage }
  }

  if (resendResult.reason === 'user_not_found') {
    return {
      error:
        'Für diese E-Mail gibt es noch kein Konto. Bitte zuerst registrieren oder eine Einladung nutzen.',
    }
  }

  if (resendResult.reason === 'send_failed' && resendResult.message) {
    return { error: resendResult.message }
  }

  // Fallback: Supabase-Standardmail (Rate-Limits beachten).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: successMessage }
}

export async function startSsoSignIn(formData: FormData): Promise<AltSignInResult> {
  const domainInput = formData.get('domain')?.toString() ?? ''
  const emailFallback = formData.get('email')?.toString() ?? ''
  const inviteToken = formData.get('invite_token')?.toString()?.trim() || null

  const domain =
    normalizeSsoDomain(domainInput) ?? (emailFallback ? normalizeSsoDomain(emailFallback) : null)

  if (!domain) {
    return { error: 'Bitte eine Firmen-Domain oder geschäftliche E-Mail eingeben.' }
  }

  const next = resolvePostAuthPath(inviteToken)
  const redirectTo = buildAuthCallbackUrl(next)

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithSSO({
    domain,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('saml')) {
      return {
        error:
          'SSO ist für diese Domain noch nicht eingerichtet. Bitte wende dich an deinen Administrator.',
      }
    }
    return { error: error.message }
  }

  if (!data?.url) {
    return { error: 'SSO konnte nicht gestartet werden. Bitte Domain prüfen oder Support kontaktieren.' }
  }

  return { redirectUrl: data.url }
}
