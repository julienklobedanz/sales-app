'use server'

import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { asTableInsert } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { ROUTES } from '@/lib/routes'
import { validatePasswordPolicy } from '@/lib/security/password-policy'
import { getAppOrigin } from '@/lib/env/app-origin'
import { parseInviteRoleDimensions } from '@/lib/roles/invite-roles'
import { parseInviteRpcJson } from '@/lib/invites/parse-invite-rpc'
import {
  buildRefstackEmailHtml,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { log } from '@/lib/observability/logger'

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
  // Service-Role weil: auth.admin.generateLink für Sign-up-Bestätigung.
  // Grenze: nur Auth-Operation für die registrierte E-Mail.
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
    log.error(
      'generateLink for confirmation email failed',
      { action: 'signUp.generateLink' },
      error,
    )
    return false
  }

  const safeName = escapeRefstackEmailHtml(params.fullName.trim())
  const actionLinkSafe = escapeRefstackEmailHtml(actionLink)

  try {
    const resend = new Resend(resendKey)
    const html = buildRefstackEmailHtml({
      audience: 'external',
      badge: 'Konto bestätigen',
      greeting: params.fullName.trim() ? `Hallo ${safeName},` : 'Hallo,',
      bodyHtml: `<p style="margin:0 0 16px;">bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
        <p style="margin:0;font-size:13px;color:#64748b;">Falls du auch eine zweite E-Mail vom Anbieter erhältst, kannst du einen der Links nutzen.</p>`,
      ctas: [{ label: 'E-Mail bestätigen', href: actionLink }],
      supplementalHtml: `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Alternativ-Link: <a href="${actionLinkSafe}" style="color:#2563eb;">${actionLinkSafe}</a></p>`,
    })
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to: params.email,
      subject: 'E-Mail bestätigen – Refstack',
      html,
    })
    return true
  } catch (e) {
    log.error(
      'Resend confirmation email failed',
      { action: 'signUp.resendConfirmation' },
      e,
    )
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
  const policy = validatePasswordPolicy(password)
  if (!policy.success) return { error: policy.error }

  const supabase = await createServerSupabaseClient()

  const redirectTo = getAppOrigin()

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
      const { data: inviteData, error: inviteError } = await supabase.rpc(
        'get_invite_by_token',
        {
          invite_token: inviteToken,
        },
      )

      const parsed = parseInviteRpcJson(inviteData)
      const organizationId = parsed?.organization_id ?? null
      if (!inviteError && organizationId && data.user?.id) {
        const inviteRoles = parseInviteRoleDimensions(parsed ?? {})

        await supabase.from('profiles').upsert(
          asTableInsert<'profiles'>({
            id: data.user.id,
            organization_id: organizationId,
            system_role: inviteRoles.systemRole,
            function_role: inviteRoles.functionRole,
            full_name: fullName,
          }),
        )
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
