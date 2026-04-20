'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { formatRelativeTimeDe } from '@/lib/relative-time-de'
import type { AppRole } from '@/hooks/useRole'

export type DashboardNotificationItem = {
  id: string
  title: string
  text: string
  time: string
  href: string
  read: boolean
}

/** Freigaben für die Notification-Bell (kein Activity-Spam wie „Referenz angesehen“). */
const INBOX_EVENT_TYPES = [
  'reference_approval_responded',
  'customer_approval_requested',
  'internal_approval_decided',
] as const

type InboxCandidate = {
  id: string
  title: string
  text: string
  href: string
  createdAt: string
  priority: number
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

  const payload = (row.payload ?? {}) as Record<string, unknown>

  if (eventType === 'reference_approval_responded') {
    const decision = String(payload.decision ?? '')
    const text =
      decision === 'approved'
        ? `„${refTitle}“ wurde vom Kunden freigegeben.`
        : decision === 'rejected'
          ? `„${refTitle}“ wurde vom Kunden abgelehnt.`
          : `Antwort zu „${refTitle}“.`
    return {
      id: `approval:${row.id}`,
      title: 'Kunden-Freigabe',
      text,
      href: row.reference_id ? ROUTES.evidence.detail(row.reference_id) : ROUTES.evidence.root,
      createdAt: row.created_at,
      priority: 4,
    }
  }

  if (eventType === 'customer_approval_requested') {
    return {
      id: `approval:${row.id}`,
      title: 'Kunden-Freigabe angefragt',
      text: `Freigabe-E-Mail für „${refTitle}“ wurde versendet (oder Anfrage gespeichert).`,
      href: row.reference_id ? ROUTES.evidence.detail(row.reference_id) : ROUTES.evidence.root,
      createdAt: row.created_at,
      priority: 4,
    }
  }

  if (eventType === 'internal_approval_decided') {
    const d = String(payload.decision ?? '')
    let detail = 'Entscheidung liegt vor.'
    if (d === 'approve_external') detail = 'Freigabe: extern nutzbar.'
    else if (d === 'approve_internal') detail = 'Freigabe: nur intern.'
    else if (d === 'reject') detail = 'Anfrage abgelehnt.'
    return {
      id: `approval:${row.id}`,
      title: 'Interne Freigabe',
      text: `„${refTitle}“: ${detail}`,
      href: row.reference_id ? ROUTES.evidence.detail(row.reference_id) : ROUTES.evidence.root,
      createdAt: row.created_at,
      priority: 4,
    }
  }

  return {
    id: `approval:${row.id}`,
    title: 'Hinweis',
    text: 'Neues Ereignis in Ihrer Organisation.',
    href: ROUTES.home,
    createdAt: row.created_at,
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
    return `${input.personName} wechselte von ${oldRole} bei ${oldCompany} zu ${newRole} bei ${newCompany}.`
  }
  if (input.personTitleBefore && input.personTitleAfter) {
    return `${input.personName} wechselte von ${input.personTitleBefore} zu ${input.personTitleAfter} bei ${input.companyName}.`
  }
  if (input.personTitleAfter) {
    return `${input.personName} ist jetzt ${input.personTitleAfter} bei ${input.companyName}.`
  }
  return `${input.personName} wechselte zu ${input.companyName}.`
}

function roleCanSeeApprovalEvent(role: AppRole, row: EventRowForCopy, userId: string) {
  if (role === 'admin' || role === 'account_manager') return true
  // Sales sieht nur Freigabe-Events, die aus seinen eigenen Anfragen stammen.
  return row.created_by === userId
}

export async function getInboxNotificationsImpl(
  userId: string,
  role: AppRole
): Promise<DashboardNotificationItem[]> {
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()

  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
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
    `
    )
    .eq('organization_id', orgId)
    .in('event_type', [...INBOX_EVENT_TYPES] as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    console.error('[getInboxNotifications]', error.message)
    return []
  }
  const approvalCandidates: InboxCandidate[] = (events ?? [])
    .map((row) => row as unknown as EventRowForCopy)
    .filter((row) => roleCanSeeApprovalEvent(role, row, userId))
    .map((row) => mapEventToCopy(row.event_type, row))

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
      company_id,
      companies ( name, is_favorite )
    `
    )
    .order('detected_at', { ascending: false })
    .limit(80)
  if (execError) console.error('[getInboxNotifications/executive]', execError.message)

  const { data: newsRows, error: newsError } = await supabase
    .from('market_signal_account_news')
    .select(
      `
      id,
      body,
      source_label,
      published_on,
      company_id,
      companies ( name, is_favorite )
    `
    )
    .order('published_on', { ascending: false })
    .limit(80)
  if (newsError) console.error('[getInboxNotifications/news]', newsError.message)

  const favoriteCompanyNames = new Set(
    (executiveRows ?? [])
      .map((row) => {
        const co = Array.isArray(row.companies) ? row.companies[0] : row.companies
        if (!co?.is_favorite) return null
        return normalizeText(String(co.name ?? ''))
      })
      .filter((name): name is string => Boolean(name))
  )

  const executiveSeen = new Set<string>()
  const executiveCandidates: InboxCandidate[] = (executiveRows ?? [])
    .map((row) => {
      const co = Array.isArray(row.companies) ? row.companies[0] : row.companies
      const companyName = String(co?.name ?? 'Account')
      const summary = String(row.change_summary ?? '')
      const summaryNorm = normalizeText(summary)
      const companyFavorite = Boolean(co?.is_favorite)
      const mentionsFavorite = [...favoriteCompanyNames].some((name) => summaryNorm.includes(name))
      const championMove = companyFavorite || mentionsFavorite
      const dayKey = String(row.detected_at ?? '').slice(0, 10)
      const dedupeKey = [
        normalizeText(String(row.person_name ?? '')),
        normalizeText(String(row.person_title_before ?? '')),
        normalizeText(String(row.person_title_after ?? '')),
        normalizeText(summary),
        dayKey,
      ].join('|')
      if (executiveSeen.has(dedupeKey)) return null
      executiveSeen.add(dedupeKey)
      if (role === 'sales' && !championMove) return null
      return {
        id: `market_exec:${String(row.id)}`,
        title: championMove ? 'Champion Move' : 'Executive Tracking',
        text: buildExecutiveSentence({
          personName: String(row.person_name ?? ''),
          personTitleBefore: (row.person_title_before as string | null) ?? null,
          personTitleAfter: (row.person_title_after as string | null) ?? null,
          companyName,
          summary,
        }),
        href: ROUTES.accountsDetail(String(row.company_id)),
        createdAt: String(row.detected_at ?? ''),
        priority: championMove ? 0 : 2,
      } satisfies InboxCandidate
    })
    .filter((row): row is InboxCandidate => Boolean(row))

  const newsSeen = new Set<string>()
  const newsCandidates: InboxCandidate[] = (newsRows ?? [])
    .map((row) => {
      const co = Array.isArray(row.companies) ? row.companies[0] : row.companies
      const companyName = String(co?.name ?? 'Account')
      const body = String(row.body ?? '').trim()
      const isFavorite = Boolean(co?.is_favorite)
      if (role === 'sales' && !isFavorite) return null
      const dayKey = String(row.published_on ?? '').slice(0, 10)
      const dedupeKey = [normalizeText(companyName), normalizeText(body), dayKey].join('|')
      if (newsSeen.has(dedupeKey)) return null
      newsSeen.add(dedupeKey)
      return {
        id: `market_news:${String(row.id)}`,
        title: isFavorite ? 'Account News (Following)' : 'Account News',
        text: body || `Neues Signal bei ${companyName}.`,
        href: ROUTES.accountsDetail(String(row.company_id)),
        createdAt: String(row.published_on ?? ''),
        priority: isFavorite ? 1 : 3,
      } satisfies InboxCandidate
    })
    .filter((row): row is InboxCandidate => Boolean(row))

  const merged = [...executiveCandidates, ...newsCandidates, ...approvalCandidates]
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
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
    time: formatRelativeTimeDe(entry.createdAt),
    href: entry.href,
    read: readSet.has(entry.id),
  }))
}
