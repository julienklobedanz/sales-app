import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ReferenceActivityItem = {
  id: string
  at: string
  title: string
  detail: string | null
}

const SALES_ONLY_EVENT_TYPES = ['reference_shared', 'reference_exported'] as const

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
    case 'reference_viewed':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Referenz angesehen',
        detail: 'Detailansicht in der App geöffnet.',
      }
    case 'reference_matched':
      return {
        id: row.id,
        at: row.created_at,
        title: 'In Match-Ergebnissen',
        detail: 'Referenz erschien in einer Kunden- oder Deal-Suche.',
      }
    case 'share_link_viewed':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Öffentlicher Link aufgerufen',
        detail: 'Jemand hat den geteilten Link geöffnet.',
      }
    case 'reference_helped':
      return {
        id: row.id,
        at: row.created_at,
        title: 'Als hilfreich markiert',
        detail: 'Im Deal-Kontext als hilfreich gewertet.',
      }
    case 'ki_entwurf_generated':
      return {
        id: row.id,
        at: row.created_at,
        title: 'KI-Entwurf erzeugt',
        detail: 'Assistent hat Inhalte vorgeschlagen.',
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
 * Letzte Aktivitäten aus evidence_events (max. 5). Sales: nur Link + Exporte.
 */
export async function getReferenceDetailActivities(
  referenceId: string,
  role: 'admin' | 'sales' | 'account_manager'
): Promise<ReferenceActivityItem[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const salesOnly = role === 'sales'

  let q = supabase
    .from('evidence_events')
    .select('id, created_at, event_type, payload')
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (salesOnly) {
    q = q.in('event_type', [...SALES_ONLY_EVENT_TYPES])
  }

  const { data, error } = await q
  if (error) {
    console.error('[getReferenceDetailActivities]', error.message)
    return []
  }

  return (data ?? []).map((row) =>
    mapRowToActivity(row as { id: string; created_at: string; event_type: string; payload: unknown })
  )
}
