import { createServerSupabaseClient } from '@/lib/supabase/server'

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
] as const

function mapRowToActivity(row: {
  id: string
  created_at: string
  event_type: string
  payload: unknown
}): ReferenceActivityItem {
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
    case 'reference_approval_responded':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Kundenfreigabe entschieden',
        detail: 'Antwort über den Freigabe-Link.',
      }
    case 'customer_approval_requested':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Kundenfreigabe angefragt',
        detail: 'E-Mail an Kundenkontakt ausgelöst (oder vorbereitet).',
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
export async function getReferenceDetailActivities(referenceId: string): Promise<ReferenceActivityItem[]> {
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
    console.error('[getReferenceDetailActivities]', error.message)
    return []
  }

  return (data ?? []).map((row) =>
    mapRowToActivity(row as { id: string; created_at: string; event_type: string; payload: unknown })
  )
}
