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

const INBOX_EVENT_TYPES = ['reference_approval_responded'] as const

function userCanSeeEvent(
  role: AppRole,
  eventCreatedBy: string | null,
  userId: string
): boolean {
  if (eventCreatedBy === userId) return true
  if (eventCreatedBy == null) {
    return role === 'admin' || role === 'account_manager'
  }
  return false
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
      references ( title )
    `
    )
    .eq('organization_id', orgId)
    .in('event_type', [...INBOX_EVENT_TYPES])
    .order('created_at', { ascending: false })
    .limit(40)

  if (error || !events?.length) {
    if (error) console.error('[getInboxNotifications]', error.message)
    return []
  }

  const visible = events.filter((e) =>
    userCanSeeEvent(role, (e.created_by as string | null) ?? null, userId)
  )
  if (!visible.length) return []

  const ids = visible.map((e) => e.id as string)
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('evidence_event_id')
    .eq('user_id', userId)
    .in('evidence_event_id', ids)

  const readSet = new Set((reads ?? []).map((r) => r.evidence_event_id as string))

  return visible.map((row) => {
    const refTitle =
      (Array.isArray(row.references) ? row.references[0] : row.references) as
        | { title?: string }
        | null
        | undefined
    const title =
      row.event_type === 'reference_approval_responded'
        ? 'Kunden-Freigabe'
        : 'Hinweis'
    const payload = (row.payload as { decision?: string; comment?: string | null }) ?? {}
    const decision = String(payload.decision ?? '')
    const text =
      decision === 'approved'
        ? `„${refTitle?.title ?? 'Referenz'}“ wurde vom Kunden freigegeben.`
        : decision === 'rejected'
          ? `„${refTitle?.title ?? 'Referenz'}“ wurde vom Kunden abgelehnt.`
          : `Antwort zu „${refTitle?.title ?? 'Referenz'}“.`
    const refId = row.reference_id as string | null
    const href = refId ? ROUTES.evidence.detail(refId) : ROUTES.evidence.root
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
