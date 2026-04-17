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

/** Freigaben + relevante Status-Events für die Notification-Bell (kein Activity-Spam wie „Referenz angesehen“). */
const INBOX_EVENT_TYPES = [
  'reference_approval_responded',
  'customer_approval_requested',
  'internal_approval_decided',
  'deal_won',
  'deal_lost',
  'deal_withdrawn',
] as const

function refTitleFromRow(row: {
  references?: { title?: string } | { title?: string }[] | null
}): string {
  const r = row.references
  const t = Array.isArray(r) ? r[0] : r
  return typeof t?.title === 'string' && t.title.trim() ? t.title : 'Referenz'
}

function dealTitleFromRow(row: { deals?: { title?: string } | { title?: string }[] | null }): string {
  const d = row.deals
  const t = Array.isArray(d) ? d[0] : d
  return typeof t?.title === 'string' && t.title.trim() ? t.title : 'Deal'
}

type EventRowForCopy = {
  reference_id: string | null
  deal_id: string | null
  payload: unknown
  references?: { title?: string } | { title?: string }[] | null
  deals?: { title?: string } | { title?: string }[] | null
}

function mapEventToCopy(eventType: string, row: EventRowForCopy): { title: string; text: string; href: string } {
  const refTitle = refTitleFromRow(row)
  const dealTitle = dealTitleFromRow(row)

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
      title: 'Kunden-Freigabe',
      text,
      href: row.reference_id ? ROUTES.evidence.detail(row.reference_id) : ROUTES.evidence.root,
    }
  }

  if (eventType === 'customer_approval_requested') {
    return {
      title: 'Kunden-Freigabe angefragt',
      text: `Freigabe-E-Mail für „${refTitle}“ wurde versendet (oder Anfrage gespeichert).`,
      href: row.reference_id ? ROUTES.evidence.detail(row.reference_id) : ROUTES.evidence.root,
    }
  }

  if (eventType === 'internal_approval_decided') {
    const d = String(payload.decision ?? '')
    let detail = 'Entscheidung liegt vor.'
    if (d === 'approve_external') detail = 'Freigabe: extern nutzbar.'
    else if (d === 'approve_internal') detail = 'Freigabe: nur intern.'
    else if (d === 'reject') detail = 'Anfrage abgelehnt.'
    return {
      title: 'Interne Freigabe',
      text: `„${refTitle}“: ${detail}`,
      href: row.reference_id ? ROUTES.evidence.detail(row.reference_id) : ROUTES.evidence.root,
    }
  }

  if (eventType === 'deal_won') {
    const comment = typeof payload.comment === 'string' && payload.comment.trim() ? payload.comment.trim() : null
    return {
      title: 'Deal gewonnen',
      text: comment ? `„${dealTitle}“ – ${comment}` : `„${dealTitle}“ wurde als gewonnen markiert.`,
      href: row.deal_id ? ROUTES.deals.detail(row.deal_id) : ROUTES.deals.root,
    }
  }

  if (eventType === 'deal_lost') {
    const comment = typeof payload.comment === 'string' && payload.comment.trim() ? payload.comment.trim() : null
    return {
      title: 'Deal verloren',
      text: comment ? `„${dealTitle}“ – ${comment}` : `„${dealTitle}“ wurde als verloren markiert.`,
      href: row.deal_id ? ROUTES.deals.detail(row.deal_id) : ROUTES.deals.root,
    }
  }

  if (eventType === 'deal_withdrawn') {
    const comment = typeof payload.comment === 'string' && payload.comment.trim() ? payload.comment.trim() : null
    return {
      title: 'Deal zurückgezogen',
      text: comment ? `„${dealTitle}“ – ${comment}` : `„${dealTitle}“ wurde zurückgezogen.`,
      href: row.deal_id ? ROUTES.deals.detail(row.deal_id) : ROUTES.deals.root,
    }
  }

  return {
    title: 'Hinweis',
    text: 'Neues Ereignis in Ihrer Organisation.',
    href: ROUTES.home,
  }
}

export async function getInboxNotificationsImpl(
  userId: string,
  _role: AppRole
): Promise<DashboardNotificationItem[]> {
  void _role
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
  if (!events?.length) return []

  const ids = events.map((e) => e.id as string)
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('evidence_event_id')
    .eq('user_id', userId)
    .in('evidence_event_id', ids)

  const readSet = new Set((reads ?? []).map((r) => r.evidence_event_id as string))

  return events.map((row) => {
    const et = row.event_type as string
    const { title, text, href } = mapEventToCopy(et, row as EventRowForCopy)
    const createdAt = row.created_at as string
    return {
      id: row.id as string,
      title,
      text,
      time: formatRelativeTimeDe(createdAt),
      href,
      read: readSet.has(row.id as string),
    }
  })
}
