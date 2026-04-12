'use server'

import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { ROUTES } from '@/lib/routes'

export type SignUpResult = {
  error?: string
  success?: boolean
  /** Schneller Versand über Resend, falls konfiguriert */
  confirmationDelivery?: 'resend' | 'supabase_default'
}

async function sendSignupConfirmationViaResend(params: {
  email: string
  password: string
  fullName: string
  appOrigin: string
}): Promise<boolean> {
  const admin = createServiceRoleSupabaseClient()
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (!admin || !resendKey) return false

  const callbackBase = params.appOrigin.startsWith('http')
    ? params.appOrigin
    : `https://${params.appOrigin}`

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: params.email,
    password: params.password,
    options: {
      redirectTo: `${callbackBase}/auth/callback`,
      data: { full_name: params.fullName },
    },
  })

  const actionLink = data?.properties?.action_link
  if (error || !actionLink) {
    console.error('[signUp] generateLink für Bestätigungsmail:', error)
    return false
  }

  const safeName = params.fullName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  try {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'Refstack <onboarding@resend.dev>',
      to: params.email,
      subject: 'E-Mail bestätigen – Refstack',
      html: `
        <p>Hallo ${safeName},</p>
        <p>bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:</p>
        <p><a href="${actionLink}" style="background: hsl(0 0% 9%); color: hsl(0 0% 98%); padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">E-Mail bestätigen</a></p>
        <p style="color: hsl(0 0% 45%); font-size: 12px;">Falls du auch eine zweite E-Mail vom Anbieter erhältst, kannst du einen der Links nutzen.</p>
      `,
    })
    return true
  } catch (e) {
    console.error('[signUp] Resend Bestätigungsmail:', e)
    return false
  }
}

export async function signUp(formData: FormData): Promise<SignUpResult> {
  const fullName = formData.get('full_name')?.toString()?.trim()
  const email = formData.get('email')?.toString()?.trim()
  const password = formData.get('password')?.toString()

  if (!fullName) return { error: 'Bitte Name eingeben.' }
  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }
  if (!password) return { error: 'Bitte Passwort eingeben.' }
  if (password.length < 6) {
    return { error: 'Das Passwort muss mindestens 6 Zeichen haben.' }
  }

  const supabase = await createServerSupabaseClient()

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '') || 'http://localhost:3000'
  const redirectTo = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${redirectTo}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Diese E-Mail ist bereits registriert. Melde dich an.' }
    }
    return { error: error.message }
  }

  // Mit E-Mail-Bestätigung: oft keine Session bis Bestätigung → Erfolg anzeigen
  // Ohne Bestätigung: Session wird gesetzt → Onboarding (ggf. mit Einladung) oder Dashboard
  if (data.session) {
    const inviteToken = formData.get('invite_token')?.toString()?.trim()
    if (inviteToken) {
      // Invite-Flow: Workspace direkt zuordnen, dann ins Dashboard.
      const { data: inviteData, error: inviteError } = await supabase.rpc('get_invite_by_token', {
        invite_token: inviteToken,
      })

      const parsed = inviteData as { organization_id?: string; role?: string } | null
      const organizationId = parsed?.organization_id ?? null
      if (!inviteError && organizationId) {
        const roleRaw = (parsed?.role ?? 'sales').toString()
        const role =
          roleRaw === 'admin' || roleRaw === 'sales' || roleRaw === 'account_manager'
            ? roleRaw
            : 'sales'

        await supabase.from('profiles').upsert({
          id: data.user?.id,
          organization_id: organizationId,
          role,
          full_name: fullName,
        })
        redirect(ROUTES.home)
      }

      redirect(`${ROUTES.onboarding}?invite=${encodeURIComponent(inviteToken)}`)
    }
    redirect(ROUTES.onboarding)
  }

  let confirmationDelivery: SignUpResult['confirmationDelivery'] = 'supabase_default'
  if (data.user && !data.session) {
    const sent = await sendSignupConfirmationViaResend({
      email,
      password,
      fullName,
      appOrigin: redirectTo,
    })
    if (sent) confirmationDelivery = 'resend'
  }

  return { success: true, confirmationDelivery }
}
