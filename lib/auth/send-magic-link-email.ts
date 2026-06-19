import { Resend } from 'resend'

import {
  buildRefstackEmailHtml,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import {
  isResendSandboxRecipientError,
  resolveResendRecipient,
  shouldMockResendSend,
} from '@/lib/email/resend-dev-override'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export type SendMagicLinkEmailResult =
  | { ok: true; delivery: 'resend' }
  | { ok: false; reason: 'not_configured' | 'user_not_found' | 'generate_failed' | 'send_failed'; message?: string }

export async function sendMagicLinkEmailViaResend(params: {
  email: string
  redirectTo: string
  inviteToken?: string | null
}): Promise<SendMagicLinkEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim()
  // Service-Role weil: auth.admin.generateLink (kein User-Kontext).
  // Grenze: nur Auth-Operation für die angegebene E-Mail-Adresse.
  const admin = createServiceRoleSupabaseClient()
  if (!admin || !resendKey) {
    return { ok: false, reason: 'not_configured' }
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: params.email,
    options: {
      redirectTo: params.redirectTo,
    },
  })

  const actionLink = data?.properties?.action_link
  if (error || !actionLink) {
    const message = error?.message ?? ''
    if (/user not found/i.test(message) || /not found/i.test(message)) {
      return { ok: false, reason: 'user_not_found', message }
    }
    console.error('[sendMagicLinkEmailViaResend] generateLink:', error)
    return { ok: false, reason: 'generate_failed', message }
  }

  if (shouldMockResendSend()) {
    console.info('[sendMagicLinkEmailViaResend] RESEND_MOCK_SUCCESS – Link:', actionLink)
    return { ok: true, delivery: 'resend' }
  }

  const recipient = resolveResendRecipient(params.email)
  const inviteNote = params.inviteToken
    ? '<p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;">Du wurdest eingeladen – nach dem Klick landest du direkt im Onboarding.</p>'
    : ''

  const devNote = recipient.devRedirected
    ? `<p style="margin:12px 0 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">[Dev] Ursprünglicher Empfänger: ${escapeRefstackEmailHtml(recipient.originalTo)}</p>`
    : ''

  const html = buildRefstackEmailHtml({
    audience: 'internal',
    badge: 'Anmeldung',
    greeting: 'Hallo,',
    bodyHtml: `<p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">klicke auf den Button, um dich bei RefStack anzumelden. Der Link ist nur kurz gültig.</p>${inviteNote}${devNote}`,
    ctas: [{ label: 'Bei RefStack anmelden', href: actionLink, variant: 'primary' }],
    supplementalHtml:
      '<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>',
  })

  try {
    const resend = new Resend(resendKey)
    const { error: sendError } = await resend.emails.send({
      from: getRefstackResendFrom(),
      to: recipient.to,
      subject: 'Anmelde-Link – RefStack',
      html,
    })

    if (sendError) {
      if (isResendSandboxRecipientError(sendError.message)) {
        return {
          ok: false,
          reason: 'send_failed',
          message:
            'E-Mail konnte nicht gesendet werden. In Resend sind nur verifizierte Test-Empfänger erlaubt – RESEND_DEV_OVERRIDE_TO setzen oder Domain verifizieren.',
        }
      }
      console.error('[sendMagicLinkEmailViaResend] Resend:', sendError)
      return { ok: false, reason: 'send_failed', message: sendError.message }
    }

    return { ok: true, delivery: 'resend' }
  } catch (e) {
    console.error('[sendMagicLinkEmailViaResend] Resend exception:', e)
    return { ok: false, reason: 'send_failed' }
  }
}
