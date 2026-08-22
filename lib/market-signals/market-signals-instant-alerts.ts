import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'
import { Resend } from 'resend'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import {
  buildRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getAppOrigin } from '@/lib/env/app-origin'
import {
  marketSignalsDigestRoleFromProfile,
  resolveAllowedCompanyIdsForMarketSignals,
  type MarketSignalsDigestExecutive,
  type MarketSignalsDigestNews,
} from '@/lib/market-signals/market-signals-digest'

type AdminClient = SupabaseClient<Database>

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function mailFrom(): string {
  return getRefstackResendFrom()
}

function orgIdFromCompaniesJoin(companies: unknown): string {
  const c = Array.isArray(companies) ? companies[0] : companies
  if (!c || typeof c !== 'object') return ''
  const oid = (c as { organization_id?: string | null }).organization_id
  return typeof oid === 'string' ? oid : ''
}

function notificationSettingsRecord(
  ns: Json | null | undefined,
): Record<string, unknown> {
  if (!ns || typeof ns !== 'object' || Array.isArray(ns)) return {}
  return ns as Record<string, unknown>
}

async function companyIdsForOrganization(
  admin: AdminClient,
  organizationId: string,
): Promise<string[]> {
  const { data } = await admin
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
  return (data ?? []).map((c) => c.id).filter(Boolean)
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
      : `<h2 style="font-size:16px;margin:16px 0 8px 0;">${COPY.marketSignals.newsSection}</h2><ul style="margin:0 0 12px 0;padding-left:20px;">${news
          .map(
            (n) =>
              `<li style="margin-bottom:8px;"><strong>${escapeHtml(n.companyName)}</strong><br/>${escapeHtml(n.body)}</li>`,
          )
          .join('')}</ul>`

  const execBlock =
    executives.length === 0
      ? ''
      : `<h2 style="font-size:16px;margin:16px 0 8px 0;">${COPY.marketSignals.executiveSection}</h2><ul style="margin:0 0 12px 0;padding-left:20px;">${executives
          .map(
            (e) =>
              `<li style="margin-bottom:8px;"><strong>${escapeHtml(e.personName)}</strong> · ${escapeHtml(e.companyName)}<br/>${escapeHtml(e.summary)}</li>`,
          )
          .join('')}</ul>`

  return buildRefstackEmailHtml({
    audience: 'internal',
    badge: 'Markt-Signale',
    greeting: `Hallo ${escapeHtml(recipientName || 'du')},`,
    bodyHtml: `<p style="margin:0 0 12px;font-size:15px;">Es gibt <strong>neue Markt-Signale</strong> für deine priorisierten Accounts.</p>
      ${newsBlock}
      ${execBlock}`,
    ctas: [{ label: 'Im Dashboard ansehen', href: signalsUrl }],
    supplementalHtml:
      '<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Sofortbenachrichtigungen kannst du unter Einstellungen › Profil steuern.</p>',
  })
}

/**
 * Nach Ingest: gebündelte Sofort-E-Mail pro Nutzer (nur priorisierte Companies).
 */
export async function notifyInstantMarketSignalsAfterIngest(
  admin: AdminClient,
  opts: { sinceIso: string; organizationId?: string | null },
): Promise<{ emailed: number; skipped: boolean; errors: string[] }> {
  const { sinceIso, organizationId } = opts
  const errors: string[] = []
  let emailed = 0

  let newsQuery = admin
    .from('market_signal_account_news')
    .select(
      'id, body, company_id, published_on, source_label, companies ( name, organization_id )',
    )
    .gte('created_at', sinceIso)

  let execQuery = admin
    .from('market_signal_executive_events')
    .select(
      'id, person_name, change_summary, company_id, detected_at, companies ( name, organization_id )',
    )
    .gte('created_at', sinceIso)

  if (organizationId) {
    const cids = await companyIdsForOrganization(admin, organizationId)
    if (!cids.length) {
      return { emailed: 0, skipped: true, errors }
    }
    newsQuery = newsQuery.in('company_id', cids)
    execQuery = execQuery.in('company_id', cids)
  }

  const [{ data: newsRows, error: newsErr }, { data: execRows, error: execErr }] =
    await Promise.all([newsQuery.limit(500), execQuery.limit(500)])

  if (newsErr) errors.push(`news: ${newsErr.message}`)
  if (execErr) errors.push(`exec: ${execErr.message}`)

  const byOrg = new Map<string, OrgBucket>()

  function bucket(org: string): OrgBucket {
    if (!byOrg.has(org)) byOrg.set(org, { news: [], executives: [] })
    return byOrg.get(org)!
  }

  for (const row of newsRows ?? []) {
    const oid = orgIdFromCompaniesJoin(row.companies)
    if (!oid) continue
    bucket(oid).news.push({
      id: row.id,
      body: String(row.body ?? '').trim(),
      companyId: row.company_id,
      companyName: accountFromJoin(row.companies)?.name ?? 'Account',
      publishedOn: row.published_on ?? '',
      sourceLabel: row.source_label ?? null,
    })
  }

  for (const row of execRows ?? []) {
    const oid = orgIdFromCompaniesJoin(row.companies)
    if (!oid) continue
    bucket(oid).executives.push({
      id: row.id,
      personName: String(row.person_name ?? '').trim(),
      summary: String(row.change_summary ?? '').trim(),
      companyId: row.company_id,
      companyName: accountFromJoin(row.companies)?.name ?? 'Account',
      detectedAt: row.detected_at ?? '',
    })
  }

  if (byOrg.size === 0) {
    return { emailed: 0, skipped: true, errors }
  }

  const resend = getResend()

  const appOrigin = getAppOrigin()

  for (const [orgIdKey, content] of byOrg) {
    if (!content.news.length && !content.executives.length) continue

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, system_role, function_role, notification_settings, full_name')
      .eq('organization_id', orgIdKey)

    if (!(profiles ?? []).length) continue

    for (const prof of profiles ?? []) {
      const userId = prof.id
      if (!userId) continue
      const settings = notificationSettingsRecord(prof.notification_settings)

      const wantEmail = settings.email_instant_market_signals === true
      if (!wantEmail) continue

      const role = marketSignalsDigestRoleFromProfile(prof)
      const allowed = await resolveAllowedCompanyIdsForMarketSignals(
        admin,
        orgIdKey,
        role,
      )

      const newsF = content.news.filter((n) => allowed.has(n.companyId))
      const execF = content.executives.filter((e) => allowed.has(e.companyId))
      if (!newsF.length && !execF.length) continue

      const total = newsF.length + execF.length
      const recipientName = String(prof.full_name ?? '').trim()

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
    }
  }

  return { emailed, skipped: false, errors: errors.slice(0, 40) }
}
