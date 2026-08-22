import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { buildRefstackEmailHtml } from '@/lib/email/refstack-email-layout'
import { isActiveDealStatus } from '@/lib/market-signals/ingest-company-news'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

type DbClient = SupabaseClient<Database>

export type MarketSignalsDigestRole = 'admin' | 'sales' | 'account_manager'

const ADMIN_DIGEST_ROLE: MarketSignalsDigestRole = 'admin'
const SALES_DIGEST_ROLE: MarketSignalsDigestRole = 'sales'
const ACCOUNT_MANAGER_DIGEST_ROLE: MarketSignalsDigestRole = 'account_manager'

export type MarketSignalsDigestNews = {
  id: string
  body: string
  companyId: string
  companyName: string
  publishedOn: string
  sourceLabel: string | null
}

export type MarketSignalsDigestExecutive = {
  id: string
  personName: string
  summary: string
  companyId: string
  companyName: string
  detectedAt: string
}

function companyNameFromRow(companies: unknown): string {
  return accountFromJoin(companies)?.name ?? 'Account'
}

/** Digest-Rolle aus normalisierten Profil-Dimensionen (ohne profiles.role). */
export function marketSignalsDigestRoleFromProfile(
  profile: Parameters<typeof parseProfileRoles>[0],
): MarketSignalsDigestRole {
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (functionRole === 'account_manager') return ACCOUNT_MANAGER_DIGEST_ROLE
  if (isSystemAdmin(systemRole)) return ADMIN_DIGEST_ROLE
  return SALES_DIGEST_ROLE
}

/** Favoriten (+ bei Admin/AM Accounts mit aktivem Deal) – gleiche Logik wie Digest/Inbox-Priorität. */
export async function resolveAllowedCompanyIdsForMarketSignals(
  supabase: DbClient,
  organizationId: string,
  role: MarketSignalsDigestRole,
): Promise<Set<string>> {
  const { data: dealRows, error: dealErr } = await supabase
    .from('deals')
    .select('company_id,status')
    .eq('organization_id', organizationId)
    .not('company_id', 'is', null)

  const dealCompanyIds = new Set<string>()
  if (!dealErr) {
    for (const row of dealRows ?? []) {
      if (isActiveDealStatus(row.status)) {
        const id = row.company_id ?? ''
        if (id) dealCompanyIds.add(id)
      }
    }
  }

  const { data: companyRows, error: coErr } = await supabase
    .from('companies')
    .select('id,is_favorite')
    .eq('organization_id', organizationId)

  if (coErr) {
    return new Set()
  }

  const favoriteIds = new Set<string>()
  for (const row of companyRows ?? []) {
    if (Boolean(row.is_favorite)) {
      favoriteIds.add(row.id)
    }
  }

  const allowed = new Set<string>()
  if (role === SALES_DIGEST_ROLE) {
    for (const id of favoriteIds) allowed.add(id)
  } else {
    for (const id of favoriteIds) allowed.add(id)
    for (const id of dealCompanyIds) allowed.add(id)
  }

  return allowed
}

/**
 * Signale der letzten 24h für Favoriten (+ bei Admin/AM zusätzlich Accounts mit aktivem Deal).
 * Entspricht grob der Priorisierung in der Inbox (Sales nur Favoriten).
 */
export async function loadMarketSignalsDigestForUser(
  supabase: DbClient,
  input: {
    organizationId: string
    role: MarketSignalsDigestRole
    /** z. B. new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() */
    sinceIso: string
    /** YYYY-MM-DD für published_on */
    sinceDate: string
  },
): Promise<{
  news: MarketSignalsDigestNews[]
  executives: MarketSignalsDigestExecutive[]
}> {
  const { organizationId, role, sinceIso, sinceDate } = input

  const allowed = await resolveAllowedCompanyIdsForMarketSignals(
    supabase,
    organizationId,
    role,
  )

  if (!allowed.size) {
    return { news: [], executives: [] }
  }

  const ids = Array.from(allowed)

  const { data: newsRows } = await supabase
    .from('market_signal_account_news')
    .select('id, body, company_id, published_on, source_label, companies ( name )')
    .in('company_id', ids)
    .gte('published_on', sinceDate)
    .order('published_on', { ascending: false })
    .limit(40)

  const { data: execRows } = await supabase
    .from('market_signal_executive_events')
    .select(
      'id, person_name, change_summary, company_id, detected_at, companies ( name )',
    )
    .in('company_id', ids)
    .gte('detected_at', sinceIso)
    .order('detected_at', { ascending: false })
    .limit(40)

  const news: MarketSignalsDigestNews[] = (newsRows ?? []).map((row) => ({
    id: row.id,
    body: String(row.body ?? '').trim(),
    companyId: row.company_id,
    companyName: companyNameFromRow(row.companies),
    publishedOn: row.published_on ?? '',
    sourceLabel: row.source_label ?? null,
  }))

  const executives: MarketSignalsDigestExecutive[] = (execRows ?? []).map((row) => ({
    id: row.id,
    personName: String(row.person_name ?? '').trim(),
    summary: String(row.change_summary ?? '').trim(),
    companyId: row.company_id,
    companyName: companyNameFromRow(row.companies),
    detectedAt: row.detected_at ?? '',
  }))

  return { news, executives }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildMarketSignalsDigestEmailHtml(input: {
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
      ? '<p style="margin:0 0 12px 0;color:#64748b;font-size:14px;">Keine neuen Account-News in den letzten 24&nbsp;Stunden.</p>'
      : `<ul style="margin:0 0 16px 0;padding-left:20px;">${news
          .map(
            (n) =>
              `<li style="margin-bottom:10px;"><strong>${escapeHtml(n.companyName)}</strong> · ${escapeHtml(n.publishedOn)}<br/>${escapeHtml(n.body)}${n.sourceLabel ? ` <span style="color:#64748b;">(${escapeHtml(n.sourceLabel)})</span>` : ''}<br/><a href="${origin}${ROUTES.accountsDetail(n.companyId)}" style="color:#2563eb;font-size:13px;">Account öffnen</a></li>`,
          )
          .join('')}</ul>`

  const execBlock =
    executives.length === 0
      ? '<p style="margin:0 0 12px 0;color:#64748b;font-size:14px;">Keine neuen Executive-Signale in den letzten 24&nbsp;Stunden.</p>'
      : `<ul style="margin:0 0 16px 0;padding-left:20px;">${executives
          .map(
            (e) =>
              `<li style="margin-bottom:10px;"><strong>${escapeHtml(e.personName)}</strong> · ${escapeHtml(e.companyName)}<br/>${escapeHtml(e.summary)}<br/><a href="${origin}${ROUTES.accountsDetail(e.companyId)}" style="color:#2563eb;font-size:13px;">Account öffnen</a></li>`,
          )
          .join('')}</ul>`

  return buildRefstackEmailHtml({
    audience: 'internal',
    badge: 'Markt-Signale',
    greeting: `Hallo ${escapeHtml(recipientName || 'du')},`,
    bodyHtml: `<p style="margin:0 0 16px;">Hier ist dein täglicher Überblick zu <strong>Markt-Signalen</strong>: Sales sieht Favoriten; Admin und Account-Manager zusätzlich Accounts mit aktivem Deal.</p>
      <h2 style="font-size:16px;margin:20px 0 8px 0;">${COPY.marketSignals.newsSection}</h2>
      ${newsBlock}
      <h2 style="font-size:16px;margin:20px 0 8px 0;">${COPY.marketSignals.executiveSection}</h2>
      ${execBlock}`,
    ctas: [{ label: 'Alle Signale im Dashboard', href: signalsUrl }],
    supplementalHtml:
      '<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Du erhältst diese E-Mail, weil der Tagesüberblick unter Einstellungen › Profil aktiviert ist.</p>',
  })
}

export function buildMarketSignalsEmptyDigestEmailHtml(input: {
  recipientName: string
  appOrigin: string
}): string {
  const { recipientName, appOrigin } = input
  const origin = appOrigin.replace(/\/$/, '')
  const signalsUrl = `${origin}${ROUTES.marketSignals}`
  return buildRefstackEmailHtml({
    audience: 'internal',
    badge: 'Markt-Signale',
    greeting: `Hallo ${escapeHtml(recipientName || 'du')},`,
    bodyHtml:
      '<p style="margin:0 0 12px;font-size:15px;">Im gewählten 24h-Fenster gibt es <strong>keine neuen</strong> Account-News oder Executive-Signale für deine priorisierten Accounts.</p>',
    ctas: [{ label: 'Markt-Signale im Dashboard', href: signalsUrl }],
    supplementalHtml:
      '<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Du erhältst diese E-Mail, weil „Auch bei leerem Tag“ unter Einstellungen › Profil aktiviert ist.</p>',
  })
}
