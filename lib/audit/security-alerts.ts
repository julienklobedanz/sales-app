'use server'

import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  buildRefstackEmailHtml,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'

type AlertContext = {
  orgId: string
  action: string
}

const COOLDOWN_MINUTES = 30

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function fromAddress(): string {
  return getRefstackResendFrom()
}

async function shouldSend(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  alertKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from('security_alert_dispatches')
    .select('last_sent_at')
    .eq('org_id', orgId)
    .eq('alert_key', alertKey)
    .maybeSingle()
  if (!data?.last_sent_at) return true
  const last = new Date(data.last_sent_at).getTime()
  if (Number.isNaN(last)) return true
  return Date.now() - last > COOLDOWN_MINUTES * 60 * 1000
}

async function markSent(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  alertKey: string
) {
  await supabase.from('security_alert_dispatches').upsert(
    {
      org_id: orgId,
      alert_key: alertKey,
      last_sent_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,alert_key' }
  )
}

export async function maybeSendSecurityAlertMail(ctx: AlertContext): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    const resend = getResend()
    if (!resend) return

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const [
      failedCountRes,
      rateLimitedCountRes,
      orgRes,
      adminProfilesRes,
    ] = await Promise.all([
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.orgId)
        .eq('action', 'unlock_failed')
        .gte('timestamp', fifteenMinutesAgo),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.orgId)
        .eq('action', 'unlock_rate_limited')
        .gte('timestamp', fifteenMinutesAgo),
      supabase.from('organizations').select('name').eq('id', ctx.orgId).single(),
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('organization_id', ctx.orgId)
        .in('system_role', ['owner', 'admin']),
    ])

    const failedCount = failedCountRes.count ?? 0
    const rateLimitedCount = rateLimitedCountRes.count ?? 0
    const orgName = orgRes.data?.name ?? 'RefStack Workspace'
    const recipients = (adminProfilesRes.data ?? [])
      .map((p) => String(p.email ?? '').trim())
      .filter((e) => !!e)
    if (!recipients.length) return

    let alertKey: string | null = null
    let subject = ''
    let body = ''
    if (rateLimitedCount >= 5 || ctx.action === 'unlock_rate_limited') {
      alertKey = 'unlock_rate_limited_spike'
      subject = `[Security Alert] Unlock rate-limited (${orgName})`
      body = `In den letzten 15 Minuten wurden ${rateLimitedCount} rate-limited Unlock-Versuche erkannt.`
    } else if (failedCount >= 20) {
      alertKey = 'unlock_failed_spike'
      subject = `[Security Alert] Unlock failed spike (${orgName})`
      body = `In den letzten 15 Minuten wurden ${failedCount} fehlgeschlagene Unlock-Versuche erkannt.`
    }
    if (!alertKey) return

    const send = await shouldSend(supabase, ctx.orgId, alertKey)
    if (!send) return

    await resend.emails.send({
      from: fromAddress(),
      to: recipients,
      subject,
      html: buildRefstackEmailHtml({
        audience: 'internal',
        badge: 'Security Alert',
        bodyHtml: `<p style="margin:0 0 12px;">${escapeRefstackEmailHtml(body)}</p>
          <ul style="margin:0 0 12px 20px;padding:0;">
            <li>unlock_failed (15m): ${failedCount}</li>
            <li>unlock_rate_limited (15m): ${rateLimitedCount}</li>
            <li>workspace: ${escapeRefstackEmailHtml(orgName)}</li>
          </ul>
          <p style="margin:0;color:#64748b;">Bitte im Workspace unter Einstellungen → Workspace → Audit Log prüfen.</p>`,
      }),
    })

    await markSent(supabase, ctx.orgId, alertKey)
  } catch (error) {
    console.error('[maybeSendSecurityAlertMail]', error)
  }
}
