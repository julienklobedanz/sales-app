import type { SupabaseClient } from '@supabase/supabase-js'
import { ROUTES } from '@/lib/routes'
import { buildRefstackEmailHtml } from '@/lib/email/refstack-email-layout'
import { isActiveDealStatus } from '@/lib/market-signals/ingest-company-news'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

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

function companyNameFromRow(row: unknown): string {
  const r = row as { companies?: { name?: string } | { name?: string }[] | null }
  const c = r.companies
  const one = Array.isArray(c) ? c[0] : c
  return String(one?.name ?? 'Account')
}

export function parseMarketSignalsDigestRole(raw: unknown): MarketSignalsDigestRole {
  if (
    raw === ADMIN_DIGEST_ROLE ||
    raw === SALES_DIGEST_ROLE ||
    raw === ACCOUNT_MANAGER_DIGEST_ROLE
  ) {
    return raw as MarketSignalsDigestRole
  }
  return SALES_DIGEST_ROLE
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
  supabase: SupabaseClient,
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
      if (isActiveDealStatus((row as { status?: unknown }).status)) {
        const id = String((row as { company_id?: string | null }).company_id ?? '')
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
    if (Boolean((row as { is_favorite?: boolean | null }).is_favorite)) {
      const id = String((row as { id?: string }).id ?? '')
      if (id) favoriteIds.add(id)
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
  supabase: SupabaseClient,
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
    id: String((row as { id?: string }).id ?? ''),
    body: String((row as { body?: string }).body ?? '').trim(),
    companyId: String((row as { company_id?: string }).company_id ?? ''),
    companyName: companyNameFromRow(row),
    publishedOn: String((row as { published_on?: string }).published_on ?? ''),
    sourceLabel: ((row as { source_label?: string | null }).source_label ?? null) as
      | string
      | null,
  }))

  const executives: MarketSignalsDigestExecutive[] = (execRows ?? []).map((row) => ({
    id: String((row as { id?: string }).id ?? ''),
    personName: String((row as { person_name?: string }).person_name ?? '').trim(),
    summary: String((row as { change_summary?: string }).change_summary ?? '').trim(),
    companyId: String((row as { company_id?: string }).company_id ?? ''),
    companyName: companyNameFromRow(row),
    detectedAt: String((row as { detected_at?: string }).detected_at ?? ''),
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
      <h2 style="font-size:16px;margin:20px 0 8px 0;">Company Update</h2>
      ${newsBlock}
      <h2 style="font-size:16px;margin:20px 0 8px 0;">Executive Tracking</h2>
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
