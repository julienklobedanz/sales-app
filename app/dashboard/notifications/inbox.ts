'use server'

import { fetchNdaExpiryInboxCandidates } from '@/app/dashboard/notifications/nda-inbox'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { formatRelativeTimeDe } from '@/lib/relative-time-de'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import {
  profileCanManageOrgData,
  profileIsSalesRestricted,
} from '@/lib/roles/profile-guards'
import {
  newsPersonNameFromBody,
  resolveExecSignalBadge,
  resolveNewsSignalBadge,
  type MarketSignalBadge,
} from '@/lib/market-signals/signal-badge'
import { formatSignalSourceLabel } from '@/lib/market-signals/leadership-move'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { log } from '@/lib/observability/logger'

export type NotificationInboxGroup = 'signals' | 'approvals' | 'other'

export type NotificationTypeKind =
  | 'move'
  | 'executive'
  | 'company'
  | 'approval'
  | 'nda'
  | 'request'
  | 'other'

export type DashboardNotificationItem = {
  id: string
  /** Fett: Person oder kurzer Hook. */
  title: string
  /** Zusammenfassung (UI clamp 1–2 Zeilen). */
  text: string
  /** Meta-Chip: z. B. Executive Tracking, Company Update, Kunden-Freigabe. */
  category: string
  /** Typ-Chip: Move / Executive / Company / Freigabe / … */
  typeLabel: string
  typeKind: NotificationTypeKind
  group: NotificationInboxGroup
  logoUrl: string | null
  companyName: string | null
  sourceLabel: string | null
  sourceUrl: string | null
  time: string
  href: string
  read: boolean
}

/** Market-Signals älter als X Tage nicht mehr in der Bell (verhindert „6 ungelesen“ von Demo-Daten). */
const MARKET_SIGNAL_INBOX_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/** Freigaben für die Notification-Bell (kein Activity-Spam wie „Referenz angesehen“). */
const INBOX_EVENT_TYPES = [
  'reference_approval_responded',
  'reference_approval_updated',
  'customer_approval_requested',
  'internal_approval_decided',
] as const

type InboxCandidate = {
  id: string
  title: string
  text: string
  category: string
  typeLabel: string
  typeKind: NotificationTypeKind
  group: NotificationInboxGroup
  logoUrl: string | null
  companyName: string | null
  sourceLabel: string | null
  sourceUrl: string | null
  href: string
  createdAt: string
  priority: number
}

function resolveSourceHref(url: string | null | undefined, fallbackQuery: string) {
  const raw = String(url ?? '').trim()
  if (raw && /^https?:\/\//i.test(raw)) return raw
  const q = fallbackQuery.trim()
  if (!q) return null
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

function shortHook(raw: string, max = 90): string {
  const compact = raw.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Neues Update'
  if (compact.length <= max) return compact
  return `${compact.slice(0, max - 1)}…`
}

function badgeToType(badge: MarketSignalBadge): {
  typeLabel: string
  typeKind: NotificationTypeKind
} {
  if (badge === 'Move') return { typeLabel: 'Move', typeKind: 'move' }
  if (badge === 'Executive') return { typeLabel: 'Executive', typeKind: 'executive' }
  return { typeLabel: 'Company', typeKind: 'company' }
}

function refTitleFromRow(row: {
  references?: { title?: string } | { title?: string }[] | null
}): string {
  const r = row.references
  const t = Array.isArray(r) ? r[0] : r
  return typeof t?.title === 'string' && t.title.trim() ? t.title : 'Referenz'
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

type EventRowForCopy = {
  id: string
  event_type: string
  reference_id: string | null
  deal_id: string | null
  created_at: string
  created_by: string | null
  payload: unknown
  references?: { title?: string } | { title?: string }[] | null
  deals?: { title?: string } | { title?: string }[] | null
}

function mapEventToCopy(eventType: string, row: EventRowForCopy): InboxCandidate {
  const refTitle = refTitleFromRow(row)
  const href = row.reference_id
    ? ROUTES.references.detail(row.reference_id)
    : ROUTES.references.root
  const base = {
    id: `approval:${row.id}`,
    typeLabel: 'Freigabe',
    typeKind: 'approval' as const,
    group: 'approvals' as const,
    logoUrl: null,
    companyName: null,
    sourceLabel: null,
    sourceUrl: null,
    href,
    createdAt: row.created_at,
    priority: 1,
  }

  const payload = (row.payload ?? {}) as Record<string, unknown>

  if (eventType === 'reference_approval_responded') {
    const decision = String(payload.decision ?? '')
    const comment =
      typeof payload.comment === 'string' && payload.comment.trim()
        ? payload.comment.trim()
        : ''
    const text =
      decision === 'approved'
        ? `„${refTitle}“ wurde vom Kunden freigegeben.`
        : decision === 'rejected'
          ? `„${refTitle}“ wurde vom Kunden abgelehnt.`
          : decision === 'changes_needed'
            ? comment
              ? `„${refTitle}“: Änderungswünsche — „${comment.length > 80 ? `${comment.slice(0, 80)}…` : comment}“`
              : `„${refTitle}“: Der Kunde wünscht Anpassungen vor der Freigabe.`
            : `Antwort zu „${refTitle}“.`
    return {
      ...base,
      title: shortHook(refTitle, 70),
      text,
      category: 'Kunden-Freigabe',
    }
  }

  if (eventType === 'reference_approval_updated') {
    return {
      ...base,
      title: shortHook(refTitle, 70),
      text: `Der Kunde hat Anmerkungen oder den Freigabe-Umfang bei „${refTitle}“ geändert.`,
      category: 'Kunden-Freigabe',
    }
  }

  if (eventType === 'customer_approval_requested') {
    return {
      ...base,
      title: shortHook(refTitle, 70),
      text: `Freigabe-E-Mail für „${refTitle}“ wurde an den Kunden versendet.`,
      category: 'Kunden-Freigabe',
    }
  }

  if (eventType === 'internal_approval_decided') {
    const d = String(payload.decision ?? '')
    let detail = 'Entscheidung liegt vor.'
    if (d === 'approved_internal')
      detail = 'Intern freigegeben — Kundenlink wurde versendet.'
    else if (d === 'approve_external') detail = 'Freigabe: extern nutzbar.'
    else if (d === 'approve_internal') detail = 'Freigabe: nur intern.'
    else if (d === 'reject' || d === 'rejected') detail = 'Anfrage abgelehnt.'
    return {
      ...base,
      title: shortHook(refTitle, 70),
      text: detail,
      category: 'Interne Freigabe',
    }
  }

  return {
    ...base,
    title: 'Hinweis',
    text: 'Neues Ereignis in Ihrer Organisation.',
    category: 'Hinweis',
    typeLabel: 'Sonstiges',
    typeKind: 'other',
    group: 'other',
    href: ROUTES.home,
    priority: 4,
  }
}

function buildExecutiveSentence(input: {
  personName: string
  personTitleBefore: string | null
  personTitleAfter: string | null
  companyName: string
  summary: string
}) {
  const summary = input.summary.trim()
  const germanPattern = /von\s+(.+?)\s+bei\s+(.+?)\s+zu\s+(.+?)\s+bei\s+(.+)/i
  const englishPattern = /from\s+(.+?)\s+at\s+(.+?)\s+to\s+(.+?)\s+at\s+(.+)/i
  const matched = summary.match(germanPattern) ?? summary.match(englishPattern)
  if (matched) {
    const [, oldRole, oldCompany, newRole, newCompany] = matched
    return `Wechselte von ${oldRole} bei ${oldCompany} zu ${newRole} bei ${newCompany}.`
  }
  if (input.personTitleBefore && input.personTitleAfter) {
    return `Wechselte von ${input.personTitleBefore} zu ${input.personTitleAfter} bei ${input.companyName}.`
  }
  if (input.personTitleAfter) {
    return `Ist jetzt ${input.personTitleAfter} bei ${input.companyName}.`
  }
  if (summary) {
    return summary
  }
  return `Update bei ${input.companyName}.`
}

function roleCanSeeApprovalEvent(
  systemRole: SystemRole,
  functionRole: FunctionRole,
  row: EventRowForCopy,
  userId: string,
) {
  if (profileCanManageOrgData(systemRole, functionRole)) return true
  return row.created_by === userId
}

export async function getInboxNotificationsImpl(
  userId: string,
  systemRole: SystemRole,
  functionRole: FunctionRole,
): Promise<DashboardNotificationItem[]> {
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()

  const orgId = profile?.organization_id
  if (!orgId) return []

  const { data: events, error } = await supabase
    .from('evidence_events')
    .select(
      `
      id,
      event_type,
      payload,
      created_at,
      created_by,
      reference_id,
      deal_id,
      references ( title ),
      deals ( title )
    `,
    )
    .eq('organization_id', orgId)
    .in('event_type', [...INBOX_EVENT_TYPES] as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    log.error('getInboxNotifications.failed', { orgId }, error)
    return []
  }
  const approvalCandidates: InboxCandidate[] = (events ?? [])
    .map((row) => row as unknown as EventRowForCopy)
    .filter((row) => roleCanSeeApprovalEvent(systemRole, functionRole, row, userId))
    .map((row) => mapEventToCopy(row.event_type, row))

  const { data: requestRows, error: requestError } = await supabase
    .from('deal_reference_requests')
    .select('id, message, created_at, deal_id, deals ( title )')
    .eq('organization_id', orgId)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (requestError)
    log.error('getInboxNotifications.requestsFailed', { orgId, userId }, requestError)

  const requestCandidates: InboxCandidate[] = (requestRows ?? []).map((row) => {
    const deal = Array.isArray(row.deals) ? row.deals[0] : row.deals
    const dealTitle =
      typeof deal?.title === 'string' && deal.title.trim() ? deal.title.trim() : 'Deal'
    const preview = String(row.message ?? '').trim()
    return {
      id: `deal_request:${String(row.id)}`,
      title: shortHook(dealTitle, 70),
      text: preview ? preview.slice(0, 160) : `Anfrage für „${dealTitle}“.`,
      category: 'Meine Requests',
      typeLabel: 'Request',
      typeKind: 'request',
      group: 'other',
      logoUrl: null,
      companyName: null,
      sourceLabel: null,
      sourceUrl: null,
      href: row.deal_id
        ? ROUTES.deals.detail(String(row.deal_id))
        : ROUTES.deals.requestNew,
      createdAt: String(row.created_at ?? ''),
      priority: 2,
    } satisfies InboxCandidate
  })

  const { data: executiveRows, error: execError } = await supabase
    .from('market_signal_executive_events')
    .select(
      `
      id,
      person_name,
      person_title_before,
      person_title_after,
      change_summary,
      detected_at,
      event_kind,
      signal_category,
      insight_signal_fact,
      source_url,
      company_id,
      companies ( name, logo_url, is_favorite )
    `,
    )
    .order('detected_at', { ascending: false })
    .limit(80)
  if (execError) log.error('getInboxNotifications.executiveFailed', { orgId }, execError)

  const { data: newsRows, error: newsError } = await supabase
    .from('market_signal_account_news')
    .select(
      `
      id,
      body,
      source_label,
      source_url,
      published_on,
      insight_signal_fact,
      company_id,
      companies ( name, logo_url, is_favorite )
    `,
    )
    .order('published_on', { ascending: false })
    .limit(80)
  if (newsError) log.error('getInboxNotifications.newsFailed', { orgId }, newsError)

  const { data: championRows } = await supabase
    .from('market_signal_champion_watchlist')
    .select('person_key, person_name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(500)
  const championPersonKeys = new Set(
    (championRows ?? []).flatMap((row) => {
      const key = normalizeText(row.person_key ?? '')
      const name = normalizeText(row.person_name ?? '')
      return [key, name].filter(Boolean)
    }),
  )

  const favoriteCompanyNames = new Set(
    (executiveRows ?? [])
      .map((row) => {
        const co = accountFromJoin(row.companies, { fallbackName: 'Account' })!
        if (!co.isFavorite) return null
        return normalizeText(co.name)
      })
      .filter((name): name is string => Boolean(name)),
  )

  const executiveSeen = new Set<string>()
  const executiveCandidates: InboxCandidate[] = (executiveRows ?? []).flatMap((row) => {
    const co = accountFromJoin(row.companies, { fallbackName: 'Account' })!
    const personName = String(row.person_name ?? '').trim()
    const changeSummary = String(row.change_summary ?? '')
    const summaryNorm = normalizeText(changeSummary)
    const personKey = normalizeText(personName)
    const isWatchedPerson = Boolean(personKey && championPersonKeys.has(personKey))
    const mentionsFavorite = [...favoriteCompanyNames].some((name) =>
      summaryNorm.includes(name),
    )
    const isRelevant = co.isFavorite || mentionsFavorite || isWatchedPerson
    const dayKey = String(row.detected_at ?? '').slice(0, 10)
    const dedupeKey = [
      personKey,
      normalizeText(String(row.person_title_before ?? '')),
      normalizeText(String(row.person_title_after ?? '')),
      normalizeText(changeSummary),
      dayKey,
    ].join('|')
    if (executiveSeen.has(dedupeKey)) return []
    executiveSeen.add(dedupeKey)

    const badge = resolveExecSignalBadge({
      personTitleBefore: (row.person_title_before as string | null) ?? null,
      personTitleAfter: (row.person_title_after as string | null) ?? null,
      eventKind: (row.event_kind as string | null) ?? null,
      personName,
      changeSummary,
      insightSignalFact: (row.insight_signal_fact as string | null) ?? null,
      signalCategory: (row.signal_category as string | null) ?? null,
    })
    const isMove = badge === 'Move'

    // Sales: Favoriten-Accounts + beobachtete Champions; Moves von Champions immer.
    if (profileIsSalesRestricted(systemRole, functionRole) && !isRelevant) return []
    // Allgemeine Executive-Mentions ohne Move nur bei Favoriten-/Watchlist-Bezug — Moves priorisieren.
    if (profileIsSalesRestricted(systemRole, functionRole) && !isMove && !co.isFavorite && !isWatchedPerson) return []

    const type = badgeToType(badge)
    const signalSummary =
      String(row.insight_signal_fact ?? '').trim() ||
      buildExecutiveSentence({
        personName,
        personTitleBefore: (row.person_title_before as string | null) ?? null,
        personTitleAfter: (row.person_title_after as string | null) ?? null,
        companyName: co.name,
        summary: changeSummary,
      })
    const sourceUrlRaw = (row.source_url as string | null) ?? null
    const sourceLabel = formatSignalSourceLabel({
      url: sourceUrlRaw,
      sourceLabel: null,
      title: signalSummary,
      companyName: co.name,
    })
    const sourceHref = resolveSourceHref(
      sourceUrlRaw,
      [personName, signalSummary, co.name].filter(Boolean).join(' '),
    )

    return [
      {
        id: `market_exec:${String(row.id)}`,
        title: personName || shortHook(signalSummary, 70),
        text: personName
          ? shortHook(signalSummary, 160)
          : shortHook(`Signal bei ${co.name}. ${signalSummary}`, 160),
        category: 'Executive Tracking',
        typeLabel: type.typeLabel,
        typeKind: type.typeKind,
        group: 'signals' as const,
        logoUrl: co.logoUrl,
        companyName: co.name,
        sourceLabel,
        sourceUrl: sourceHref,
        href: ROUTES.accountsDetail(String(row.company_id)),
        createdAt: String(row.detected_at ?? ''),
        priority: isMove ? (isRelevant ? 0 : 1) : isRelevant ? 2 : 3,
      } satisfies InboxCandidate,
    ]
  })

  const newsSeen = new Set<string>()
  const newsCandidates: InboxCandidate[] = (newsRows ?? []).flatMap((row) => {
    const co = accountFromJoin(row.companies, { fallbackName: 'Account' })!
    const body = String(row.body ?? '').trim()
    const badge = resolveNewsSignalBadge(body, co.name)
    const personName = newsPersonNameFromBody(body, co.name)?.trim() || null
    const personKey = normalizeText(personName)
    const isWatchedPerson = Boolean(personKey && championPersonKeys.has(personKey))
    const isMove = badge === 'Move'
    if (profileIsSalesRestricted(systemRole, functionRole) && !co.isFavorite && !(isMove && isWatchedPerson)) return []
    const dayKey = String(row.published_on ?? '').slice(0, 10)
    const dedupeKey = [normalizeText(co.name), normalizeText(body), dayKey].join('|')
    if (newsSeen.has(dedupeKey)) return []
    newsSeen.add(dedupeKey)

    const type = badgeToType(badge)
    const insight = String(row.insight_signal_fact ?? '').trim()
    const headline = personName || shortHook(body || `Update bei ${co.name}`, 70)
    const signalSummary = insight
      ? shortHook(insight, 160)
      : personName
        ? shortHook(body, 160)
        : body.length > headline.length + 10
          ? shortHook(body, 160)
          : shortHook(`Neues Signal bei ${co.name}.`, 120)
    const sourceUrlRaw = (row.source_url as string | null) ?? null
    const sourceLabel = formatSignalSourceLabel({
      url: sourceUrlRaw,
      sourceLabel: (row.source_label as string | null) ?? null,
      title: body,
      companyName: co.name,
    })
    const sourceHref = resolveSourceHref(
      sourceUrlRaw,
      [sourceLabel, co.name, body].filter(Boolean).join(' '),
    )

    return [
      {
        id: `market_news:${String(row.id)}`,
        title: headline,
        text: signalSummary,
        category: 'Company Update',
        typeLabel: type.typeLabel,
        typeKind: type.typeKind,
        group: 'signals' as const,
        logoUrl: co.logoUrl,
        companyName: co.name,
        sourceLabel,
        sourceUrl: sourceHref,
        href: ROUTES.accountsDetail(String(row.company_id)),
        createdAt: String(row.published_on ?? ''),
        priority: isMove
          ? co.isFavorite || isWatchedPerson
            ? 0
            : 1
          : co.isFavorite
            ? 1
            : 3,
      } satisfies InboxCandidate,
    ]
  })

  const ndaRaw = isSystemAdmin(systemRole)
    ? await fetchNdaExpiryInboxCandidates(supabase, orgId)
    : []
  const ndaCandidates: InboxCandidate[] = ndaRaw.map((entry) => ({
    id: entry.id,
    title: entry.title,
    text: entry.text,
    category: 'NDA',
    typeLabel: 'NDA',
    typeKind: 'nda',
    group: 'other',
    logoUrl: null,
    companyName: null,
    sourceLabel: null,
    sourceUrl: null,
    href: entry.href,
    createdAt: entry.createdAt,
    priority: entry.priority,
  }))

  const nowMs = Date.now()
  const isMarketSignal = (id: string) =>
    id.startsWith('market_exec:') || id.startsWith('market_news:')

  const merged = [
    ...ndaCandidates,
    ...executiveCandidates,
    ...newsCandidates,
    ...approvalCandidates,
    ...requestCandidates,
  ]
    .filter((entry) => {
      if (!isMarketSignal(entry.id)) return true
      const ageMs = nowMs - new Date(entry.createdAt).getTime()
      return ageMs <= MARKET_SIGNAL_INBOX_MAX_AGE_MS
    })
    .sort((a, b) => {
      const aNda = a.id.startsWith('nda_expiry:')
      const bNda = b.id.startsWith('nda_expiry:')
      if (aNda && bNda) {
        if (a.priority !== b.priority) return a.priority - b.priority
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      if (aNda) return -1
      if (bNda) return 1
      const aSignal = isMarketSignal(a.id)
      const bSignal = isMarketSignal(b.id)
      if (aSignal && bSignal && a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, 80)

  if (!merged.length) return []

  const keys = merged.map((entry) => entry.id)
  const { data: reads } = await supabase
    .from('notification_inbox_reads')
    .select('notification_key')
    .eq('user_id', userId)
    .in('notification_key', keys)
  const readSet = new Set((reads ?? []).map((r) => String(r.notification_key)))

  return merged.map((entry) => ({
    id: entry.id,
    title: entry.title,
    text: entry.text,
    category: entry.category,
    typeLabel: entry.typeLabel,
    typeKind: entry.typeKind,
    group: entry.group,
    logoUrl: entry.logoUrl,
    companyName: entry.companyName,
    sourceLabel: entry.sourceLabel,
    sourceUrl: entry.sourceUrl,
    time: formatRelativeTimeDe(entry.createdAt),
    href: entry.href,
    read: readSet.has(entry.id),
  }))
}
