import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import {
  buildRefstackEmailHtml,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { log } from '@/lib/observability/logger'

export type SubmitTicketResult = { success: true } | { success: false; error: string }

function supportInboxAddress(): string {
  return process.env.SUPPORT_INBOX_EMAIL?.trim() || 'support@refstack.ai'
}

function ticketMailFrom(): string {
  return getRefstackResendFrom()
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

async function notifySupportInboxEmail(params: {
  type: 'support' | 'feedback'
  userId: string
  userEmail: string
  subject: string
  message: string
  replyToEmail?: string
}): Promise<void> {
  const resend = getResend()
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      log.warn('submitTicket.resendApiKeyMissing', { nodeEnv: process.env.NODE_ENV })
    }
    return
  }

  const to = supportInboxAddress()
  const label = params.type === 'feedback' ? 'Feedback' : 'Support'
  const replyTo = params.replyToEmail?.trim() || params.userEmail?.trim() || undefined

  try {
    const html = buildRefstackEmailHtml({
      audience: 'internal',
      badge: `RefStack ${label}`,
      bodyHtml: `<p style="margin:0;white-space:pre-wrap;">${escapeRefstackEmailHtml(params.message)}</p>`,
      meta: {
        rows: [
          { label: 'Typ', value: label },
          { label: 'User-ID', value: params.userId },
          { label: 'Login', value: params.userEmail || '—' },
          { label: 'Betreff', value: params.subject },
        ],
      },
    })
    const { error } = await resend.emails.send({
      from: ticketMailFrom(),
      to: [to],
      ...(replyTo ? { replyTo } : {}),
      subject: `[RefStack ${label}] ${params.subject}`,
      html,
    })
    if (error) {
      log.error(
        'submitTicket.resendFailed',
        { type: params.type, userId: params.userId },
        error,
      )
    }
  } catch (e) {
    log.error('submitTicket.emailFailed', { type: params.type, userId: params.userId }, e)
  }
}

export async function submitTicketImpl(
  type: 'support' | 'feedback',
  subject: string,
  message: string,
  options?: { replyToEmail?: string },
): Promise<SubmitTicketResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const subj = subject?.toString()?.trim()
  const msg = message?.toString()?.trim()
  if (!subj) return { success: false, error: 'Bitte einen Betreff angeben.' }
  if (!msg) return { success: false, error: 'Bitte eine Nachricht eingeben.' }

  const { error } = await supabase.from('tickets').insert({
    user_id: user.id,
    type,
    subject: subj,
    message: msg,
    status: 'open',
  })
  if (error) return { success: false, error: error.message }

  const userEmail = user.email ?? ''
  await notifySupportInboxEmail({
    type,
    userId: user.id,
    userEmail,
    subject: subj,
    message: msg,
    replyToEmail: options?.replyToEmail,
  })

  return { success: true }
}
