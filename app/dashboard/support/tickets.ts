import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export type SubmitTicketResult = { success: true } | { success: false; error: string }

function supportInboxAddress(): string {
  return process.env.SUPPORT_INBOX_EMAIL?.trim() || 'support@refstack.ai'
}

function ticketMailFrom(): string {
  const from = process.env.RESEND_FROM?.trim()
  if (from) return from
  return 'Refstack <onboarding@resend.dev>'
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
      console.warn('[submitTicket] RESEND_API_KEY fehlt – keine Benachrichtigung an Support-Inbox.')
    }
    return
  }

  const to = supportInboxAddress()
  const label = params.type === 'feedback' ? 'Feedback' : 'Support'
  const replyTo =
    params.replyToEmail?.trim() || params.userEmail?.trim() || undefined

  try {
    const { error } = await resend.emails.send({
      from: ticketMailFrom(),
      to: [to],
      ...(replyTo ? { replyTo } : {}),
      subject: `[RefStack ${label}] ${params.subject}`,
      text: [
        `Typ: ${label}`,
        `User-ID: ${params.userId}`,
        `Login-E-Mail: ${params.userEmail || '—'}`,
        '',
        `Betreff: ${params.subject}`,
        '',
        '---',
        '',
        params.message,
      ].join('\n'),
    })
    if (error) {
      console.error('[submitTicket] Resend:', error)
    }
  } catch (e) {
    console.error('[submitTicket] E-Mail-Versand:', e)
  }
}

export async function submitTicketImpl(
  type: 'support' | 'feedback',
  subject: string,
  message: string,
  options?: { replyToEmail?: string }
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

