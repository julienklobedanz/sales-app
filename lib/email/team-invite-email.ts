import { Resend } from 'resend'

import {
  buildRefstackEmailHtml,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
  type RefstackEmailMetaRow,
} from '@/lib/email/refstack-email-layout'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

export function formatTeamInviteRoleLabel(role: 'admin' | 'sales'): string {
  return role === 'admin' ? 'Admin' : 'Sales'
}

export function humanizeTeamInviteEmailError(message?: string | null): string {
  const msg = message?.trim()
  if (!msg) {
    return 'Einladung ist gespeichert, aber E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY in der Server-Umgebung).'
  }
  if (/api key is invalid/i.test(msg) || /invalid api key/i.test(msg)) {
    return 'Einladung ist gespeichert, aber der E-Mail-Versand ist aktuell nicht korrekt konfiguriert.'
  }
  if (/RESEND_API_KEY/i.test(msg)) {
    return 'Einladung ist gespeichert, aber E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY in der Server-Umgebung).'
  }
  return msg
}

export type TeamInviteEmailParams = {
  to: string
  inviterName: string
  orgName: string
  role: 'admin' | 'sales'
  inviteLink: string
  expiresAtLabel: string
}

export function buildTeamInviteEmailHtml(params: TeamInviteEmailParams): string {
  const inviter = params.inviterName.trim() || 'Ein Teammitglied'
  const org = params.orgName.trim() || 'RefStack'

  const metaRows: RefstackEmailMetaRow[] = [
    { label: 'Arbeitsbereich', value: org },
    { label: 'Rolle', value: formatTeamInviteRoleLabel(params.role) },
    { label: 'Eingeladen von', value: inviter },
    { label: 'Gültig bis', value: params.expiresAtLabel },
  ]

  return buildRefstackEmailHtml({
    audience: 'internal',
    badge: 'Team-Einladung',
    greeting: 'Hallo,',
    bodyHtml: `<p style="margin:0 0 16px;"><strong>${escapeRefstackEmailHtml(inviter)}</strong> lädt Sie ein, dem Arbeitsbereich <strong>${escapeRefstackEmailHtml(org)}</strong> in RefStack beizutreten.</p>
      <p style="margin:0;">Erstellen Sie mit dem Button unten Ihr Konto. Der Link ist personalisiert und bis zum <strong>${escapeRefstackEmailHtml(params.expiresAtLabel)}</strong> gültig.</p>`,
    meta: { rows: metaRows },
    ctas: [{ label: 'Konto erstellen', href: params.inviteLink }],
    footerLink: {
      label: 'Falls der Button nicht funktioniert, diesen Link im Browser öffnen:',
      url: params.inviteLink,
    },
  })
}

export type SendTeamInviteEmailResult =
  | { sent: true }
  | { sent: false; error: string }

/** Team-Einladung per Resend im RefStack-Layout versenden. */
export async function sendTeamInviteEmail(
  params: TeamInviteEmailParams
): Promise<SendTeamInviteEmailResult> {
  const to = params.to.trim().toLowerCase()
  if (!to.includes('@')) {
    return { sent: false, error: 'Ungültige E-Mail-Adresse.' }
  }

  const resend = getResend()
  if (!resend) {
    return {
      sent: false,
      error:
        'RESEND_API_KEY fehlt in der Server-Umgebung (z. B. .env.local / Vercel). Ohne Key wird keine E-Mail gesendet.',
    }
  }

  const html = buildTeamInviteEmailHtml(params)
  const org = params.orgName.trim() || 'RefStack'

  try {
    const { error: sendError } = await resend.emails.send({
      from: getRefstackResendFrom(),
      to,
      subject: `Einladung zu ${org} · RefStack`,
      html,
    })
    if (sendError) {
      console.error('[sendTeamInviteEmail] Resend API:', sendError)
      return { sent: false, error: sendError.message }
    }
    return { sent: true }
  } catch (e) {
    console.error('[sendTeamInviteEmail]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return { sent: false, error: msg }
  }
}
