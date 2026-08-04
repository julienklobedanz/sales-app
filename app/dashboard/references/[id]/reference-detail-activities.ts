import { createServerSupabaseClient } from '@/lib/supabase/server'
import { log } from '@/lib/observability/logger'

export type ReferenceActivityItem = {
  id: string
  at: string
  title: string
  detail: string | null
}

/** Nur Außenwirkung / Freigabeprozess / Teilen & Exporte / Deal‑Bezug — kein „geöffnet“, Match, KI-Entwurf. */
const TIMELINE_EVENT_TYPES = [
  'reference_shared',
  'reference_exported',
  'reference_approval_responded',
  'customer_approval_requested',
  'internal_approval_decided',
  'internal_approval_requested',
  'deal_won',
  'deal_lost',
  'deal_withdrawn',
  'reference_helped',
  'approval_delegated',
  'customer_access_revoked',
] as const

function formatChangesNeededDetail(
  comment: string | null,
  giverName: string | null,
): string {
  if (!comment) return 'Anpassungen vor Freigabe angefragt.'
  if (giverName) return `(${giverName}): ${comment}`
  return comment
}

function mapRowToActivity(
  row: {
    id: string
    created_at: string
    event_type: string
    payload: unknown
  },
  context?: { fallbackGiverName?: string | null },
): ReferenceActivityItem {
  const payload =
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {}
  const eventType = String(row.event_type ?? '')

  switch (eventType) {
    case 'reference_shared':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Kundenlink erstellt',
        detail: 'Freigabe- oder Teilen-Link wurde angelegt.',
      }
    case 'reference_exported': {
      const format = payload.format
      if (format === 'pptx_onepager') {
        return {
          id: row.id,
          at: row.created_at,
          title: 'PPTX exportiert',
          detail: 'PowerPoint One-Pager wurde heruntergeladen.',
        }
      }
      const template = payload.template != null ? String(payload.template) : null
      return {
        id: row.id,
        at: row.created_at,
        title: 'PDF exportiert',
        detail: template ? `Vorlage: ${template}` : 'PDF wurde exportiert.',
      }
    }
    case 'reference_helped':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Als hilfreich markiert',
        detail: 'Im Deal-Kontext als hilfreich gewertet.',
      }
    case 'reference_approval_responded': {
      const decision = String(payload.decision ?? '')
      if (decision === 'changes_needed') {
        const comment =
          typeof payload.comment === 'string' && payload.comment.trim()
            ? payload.comment.trim()
            : null
        const giverName =
          (typeof payload.reference_giver_name === 'string' &&
            payload.reference_giver_name.trim()) ||
          context?.fallbackGiverName?.trim() ||
          null
        return {
          id: row.id,
          at: row.created_at,
          title: 'Änderungswünsche vom Kunden',
          detail: formatChangesNeededDetail(comment, giverName),
        }
      }
      return {
        id: row.id,
        at: row.created_at,
        title: 'Kundenfreigabe entschieden',
        detail:
          decision === 'approved'
            ? 'Referenz freigegeben.'
            : decision === 'rejected'
              ? 'Freigabe abgelehnt.'
              : 'Antwort über den Freigabe-Link.',
      }
    }
    case 'customer_approval_requested': {
      const afterChanges = payload.after_changes === true
      const recipient =
        typeof payload.recipient_email === 'string' && payload.recipient_email.trim()
          ? payload.recipient_email.trim()
          : null
      return {
        id: row.id,
        at: row.created_at,
        title: afterChanges ? 'Freigabe erneut angefragt' : 'Kundenfreigabe angefragt',
        detail: afterChanges
          ? recipient
            ? `Nach Anpassung der Änderungswünsche an ${recipient} gesendet.`
            : 'Nach Anpassung der Änderungswünsche erneut per E-Mail angefragt.'
          : 'E-Mail an Kundenkontakt ausgelöst (oder vorbereitet).',
      }
    }
    case 'customer_access_revoked': {
      const reason =
        typeof payload.reason === 'string' && payload.reason.trim()
          ? payload.reason.trim()
          : null
      const details =
        typeof payload.details === 'string' && payload.details.trim()
          ? payload.details.trim()
          : null
      return {
        id: row.id,
        at: row.created_at,
        title: 'Zugriff vom Kunden gesperrt',
        detail: details
          ? `${reason ?? 'Sperrung'} — ${details}`
          : (reason ?? 'Kunde hat den öffentlichen Zugriff vorübergehend gesperrt.'),
      }
    }
    case 'approval_delegated': {
      const delegateName =
        typeof payload.delegate_name === 'string' && payload.delegate_name.trim()
          ? payload.delegate_name.trim()
          : null
      const delegateEmail =
        typeof payload.delegate_email === 'string' && payload.delegate_email.trim()
          ? payload.delegate_email.trim()
          : null
      const fromGiver =
        typeof payload.from_giver === 'string' && payload.from_giver.trim()
          ? payload.from_giver.trim()
          : null
      const who = delegateName ?? delegateEmail ?? 'neuer Ansprechpartner'
      return {
        id: row.id,
        at: row.created_at,
        title: 'Freigabe delegiert',
        detail: fromGiver
          ? `${fromGiver} hat die Freigabe an ${who} weitergeleitet.`
          : `Freigabe an ${who} weitergeleitet.`,
      }
    }
    case 'internal_approval_decided':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Interne Freigabe',
        detail: 'Vier-Augen-Prüfung abgeschlossen.',
      }
    case 'internal_approval_requested':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Interne Prüfung angefragt',
        detail: 'Freigabe zur internen Prüfung eingereicht.',
      }
    case 'deal_won':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Deal gewonnen',
        detail: 'Verknüpfter Deal als gewonnen markiert.',
      }
    case 'deal_lost':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Deal verloren',
        detail: 'Verknüpfter Deal als verloren markiert.',
      }
    case 'deal_withdrawn':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Deal abgebrochen',
        detail: 'Verknüpfter Deal zurückgezogen.',
      }
    default:
      return {
        id: row.id,
        at: row.created_at,
        title: eventType || 'Ereignis',
        detail: null,
      }
  }
}

/**
 * Kompakte Historie aus evidence_events (max. 5): Freigaben, Teilen, Exporte, Deal‑Outcomes.
 * Keine Detailaufrufe, Match‑Treffer, Link‑Klicks oder KI‑Entwürfe.
 */
export async function getReferenceDetailActivities(
  referenceId: string,
): Promise<ReferenceActivityItem[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('evidence_events')
    .select('id, created_at, event_type, payload')
    .eq('reference_id', referenceId)
    .in('event_type', [...TIMELINE_EVENT_TYPES])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    log.error('getReferenceDetailActivities.failed', { referenceId }, error)
    return []
  }

  const { data: refRow } = await supabase
    .from('references')
    .select('approval_reference_giver_name')
    .eq('id', referenceId)
    .maybeSingle()

  const fallbackGiverName =
    typeof refRow?.approval_reference_giver_name === 'string'
      ? refRow.approval_reference_giver_name.trim()
      : null

  return (data ?? []).map((row) =>
    mapRowToActivity(
      row as { id: string; created_at: string; event_type: string; payload: unknown },
      { fallbackGiverName },
    ),
  )
}
