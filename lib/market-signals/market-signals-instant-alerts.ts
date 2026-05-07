import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import webpush from 'web-push'
import { ROUTES } from '@/lib/routes'
import { getAppOrigin } from '@/lib/env/app-origin'
import {
  parseMarketSignalsDigestRole,
  resolveAllowedCompanyIdsForMarketSignals,
  type MarketSignalsDigestExecutive,
  type MarketSignalsDigestNews,
} from '@/lib/market-signals/market-signals-digest'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function mailFrom(): string {
  const from = process.env.RESEND_FROM?.trim()
  if (from) return from
  return 'Refstack <onboarding@resend.dev>'
}

let webPushConfigured = false
function ensureWebPushConfigured(): boolean {
  if (webPushConfigured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:hello@refstack.io'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  webPushConfigured = true
  return true
}

function companyNameFromRow(row: unknown): string {
  const r = row as { companies?: { name?: string } | { name?: string }[] | null }
  const c = r.companies
  const one = Array.isArray(c) ? c[0] : c
  return String(one?.name ?? 'Account')
}

function orgIdFromRow(row: unknown): string {
  const r = row as { companies?: { organization_id?: string } | { organization_id?: string }[] | null }
  const c = r.companies
  const one = Array.isArray(c) ? c[0] : c
  return String(one?.organization_id ?? '')
}

async function companyIdsForOrganization(admin: SupabaseClient, organizationId: string): Promise<string[]> {
  const { data } = await admin.from('companies').select('id').eq('organization_id', organizationId)
  return (data ?? [])
    .map((c) => String((c as { id?: string }).id ?? ''))
    .filter(Boolean)
}

type OrgBucket = {
  news: MarketSignalsDigestNews[]
  executives: MarketSignalsDigestExecutive[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildInstantEmailHtml(input: {
  recipientName: string
  news: MarketSignalsDigestNews[]
  executives: MarketSignalsDigestExecutive[]
  appOrigin: string
}): string {
  const { recipientName, news, executives, appOrigin } = input
  const origin = appOrigin.replace(/\/$/, '')
  const signalsUrl = `${origin}${ROUTES.marketSignals}`

  const newsBlock =
    news.length === 0
      ? ''
      : `<h2 style="font-size:16px;margin:16px 0 8px 0;">Account News</h2><ul style="margin:0 0 12px 0;padding-left:20px;">${news
          .map(
            (n) =>
              `<li style="margin-bottom:8px;"><strong>${escapeHtml(n.companyName)}</strong><br/>${escapeHtml(n.body)}</li>`
          )
          .join('')}</ul>`

  const execBlock =
    executives.length === 0
      ? ''
      : `<h2 style="font-size:16px;margin:16px 0 8px 0;">Executive</h2><ul style="margin:0 0 12px 0;padding-left:20px;">${executives
          .map(
            (e) =>
              `<li style="margin-bottom:8px;"><strong>${escapeHtml(e.personName)}</strong> · ${escapeHtml(e.companyName)}<br/>${escapeHtml(e.summary)}</li>`
          )
          .join('')}</ul>`

  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#0f172a;">
  <p style="margin:0 0 8px 0;">Hallo ${escapeHtml(recipientName || 'du')},</p>
  <p style="margin:0 0 12px 0;font-size:15px;">Es gibt <strong>neue Markt-Signale</strong> für deine priorisierten Accounts.</p>
  ${newsBlock}
  ${execBlock}
  <p style="margin:20px 0 0 0;font-size:14px;"><a href="${signalsUrl}" style="color:#2563eb;">Im Dashboard ansehen</a></p>
  <p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;">Sofortbenachrichtigungen kannst du unter Einstellungen › Profil steuern.</p>
</body>
</html>`.trim()
}

/**
 * Nach Ingest: gebündelte Sofort-E-Mail und/oder Web Push pro Nutzer (nur priorisierte Companies).
 */
export async function notifyInstantMarketSignalsAfterIngest(
  admin: SupabaseClient,
  opts: { sinceIso: string; organizationId?: string | null }
): Promise<{ emailed: number; pushed: number; skipped: boolean; errors: string[] }> {
  const { sinceIso, organizationId } = opts
  const errors: string[] = []
  let emailed = 0
  let pushed = 0

  let newsQuery = admin
    .from('market_signal_account_news')
    .select('id, body, company_id, published_on, source_label, companies ( name, organization_id )')
    .gte('created_at', sinceIso)

  let execQuery = admin
    .from('market_signal_executive_events')
    .select('id, person_name, change_summary, company_id, detected_at, companies ( name, organization_id )')
    .gte('created_at', sinceIso)

  if (organizationId) {
    const cids = await companyIdsForOrganization(admin, organizationId)
    if (!cids.length) {
      return { emailed: 0, pushed: 0, skipped: true, errors }
    }
    newsQuery = newsQuery.in('company_id', cids)
    execQuery = execQuery.in('company_id', cids)
  }

  const [{ data: newsRows, error: newsErr }, { data: execRows, error: execErr }] = await Promise.all([
    newsQuery.limit(500),
    execQuery.limit(500),
  ])

  if (newsErr) errors.push(`news: ${newsErr.message}`)
  if (execErr) errors.push(`exec: ${execErr.message}`)

  const byOrg = new Map<string, OrgBucket>()

  function bucket(org: string): OrgBucket {
    if (!byOrg.has(org)) byOrg.set(org, { news: [], executives: [] })
    return byOrg.get(org)!
  }

  for (const row of newsRows ?? []) {
    const oid = orgIdFromRow(row)
    if (!oid) continue
    bucket(oid).news.push({
      id: String((row as { id?: string }).id ?? ''),
      body: String((row as { body?: string }).body ?? '').trim(),
      companyId: String((row as { company_id?: string }).company_id ?? ''),
      companyName: companyNameFromRow(row),
      publishedOn: String((row as { published_on?: string }).published_on ?? ''),
      sourceLabel: ((row as { source_label?: string | null }).source_label ?? null) as string | null,
    })
  }

  for (const row of execRows ?? []) {
    const oid = orgIdFromRow(row)
    if (!oid) continue
    bucket(oid).executives.push({
      id: String((row as { id?: string }).id ?? ''),
      personName: String((row as { person_name?: string }).person_name ?? '').trim(),
      summary: String((row as { change_summary?: string }).change_summary ?? '').trim(),
      companyId: String((row as { company_id?: string }).company_id ?? ''),
      companyName: companyNameFromRow(row),
      detectedAt: String((row as { detected_at?: string }).detected_at ?? ''),
    })
  }

  if (byOrg.size === 0) {
    return { emailed: 0, pushed: 0, skipped: true, errors }
  }

  const resend = getResend()
  const pushOk = ensureWebPushConfigured()

  const appOrigin = getAppOrigin()

  for (const [orgIdKey, content] of byOrg) {
    if (!content.news.length && !content.executives.length) continue

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, role, notification_settings, full_name')
      .eq('organization_id', orgIdKey)

    const userIds = (profiles ?? []).map((p) => String((p as { id?: string }).id ?? '')).filter(Boolean)
    if (!userIds.length) continue

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    const subsByUser = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>()
    for (const s of subs ?? []) {
      const uid = String((s as { user_id?: string }).user_id ?? '')
      if (!uid) continue
      if (!subsByUser.has(uid)) subsByUser.set(uid, [])
      subsByUser.get(uid)!.push({
        endpoint: String((s as { endpoint?: string }).endpoint ?? ''),
        p256dh: String((s as { p256dh?: string }).p256dh ?? ''),
        auth: String((s as { auth?: string }).auth ?? ''),
      })
    }

    for (const prof of profiles ?? []) {
      const userId = String((prof as { id?: string }).id ?? '')
      if (!userId) continue
      const ns = (prof as { notification_settings?: unknown }).notification_settings
      const settings = ns && typeof ns === 'object' ? (ns as Record<string, unknown>) : {}

      const wantEmail = settings.email_instant_market_signals === true
      const wantPushPref = settings.browser_push_market_signals === true
      const hasSubs = (subsByUser.get(userId)?.length ?? 0) > 0
      if (!wantEmail && !(wantPushPref && hasSubs && pushOk)) continue

      const role = parseMarketSignalsDigestRole((prof as { role?: unknown }).role)
      const allowed = await resolveAllowedCompanyIdsForMarketSignals(admin, orgIdKey, role)

      const newsF = content.news.filter((n) => allowed.has(n.companyId))
      const execF = content.executives.filter((e) => allowed.has(e.companyId))
      if (!newsF.length && !execF.length) continue

      const total = newsF.length + execF.length
      const recipientName = String((prof as { full_name?: string | null }).full_name ?? '').trim()

      if (wantEmail && resend) {
        const { data: userData } = await admin.auth.admin.getUserById(userId)
        const email = userData?.user?.email?.trim()
        if (email) {
          const html = buildInstantEmailHtml({
            recipientName: recipientName || email.split('@')[0] || 'du',
            news: newsF,
            executives: execF,
            appOrigin,
          })
          const { error: sendErr } = await resend.emails.send({
            from: mailFrom(),
            to: email,
            subject: `RefStack: ${total} neue Markt-Signal${total === 1 ? '' : 'e'}`,
            html,
          })
          if (sendErr) errors.push(`${email}: ${sendErr.message}`)
          else emailed += 1
        }
      }

      if (wantPushPref && pushOk && hasSubs) {
        const title = 'Neue Markt-Signale'
        const body = `${total} Hinweis${total === 1 ? '' : 'e'} (${newsF.length} News · ${execF.length} Executive)`
        const url = `${appOrigin.replace(/\/$/, '')}${ROUTES.marketSignals}`
        const payload = JSON.stringify({ title, body, url })
        for (const sub of subsByUser.get(userId) ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { TTL: 86_400 }
            )
            pushed += 1
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            const status = (e as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
              await admin.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint)
            }
            errors.push(`push: ${msg}`)
          }
        }
      }
    }
  }

  return { emailed, pushed, skipped: false, errors: errors.slice(0, 40) }
}
