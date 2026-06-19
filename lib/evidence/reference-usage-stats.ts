import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ReferenceUsageStats = {
  /** Roh-Zählung pro event_type aus evidence_events (inkl. Payload-Matches) */
  events: Record<string, number>
  dealsLinked: number
  dealsWon: number
  dealsLost: number
  dealsWithdrawn: number
}

function numRecord(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}

/**
 * Nutzungs-Kennzahlen für die Referenz-Detailseite (alle Rollen mit Zugriff).
 */
export async function getReferenceUsageStats(referenceId: string): Promise<ReferenceUsageStats | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_reference_usage_event_counts', {
    p_reference_id: referenceId,
  })
  if (rpcErr) {
    console.error('[getReferenceUsageStats] rpc', rpcErr.message)
  }

  const events = numRecord(rpcData)

  const { data: drRows } = await supabase
    .from('deal_references')
    .select('deal_id')
    .eq('reference_id', referenceId)

  const dealIds = [...new Set((drRows ?? []).map((r) => r.deal_id as string).filter(Boolean))]
  let dealsWon = 0
  let dealsLost = 0
  let dealsWithdrawn = 0

  if (dealIds.length > 0) {
    const { data: deals } = await supabase.from('deals').select('status').in('id', dealIds)
    for (const d of deals ?? []) {
      const s = String((d as { status?: string }).status ?? '').toLowerCase()
      if (s === 'won') dealsWon += 1
      else if (s === 'lost') dealsLost += 1
      else if (s === 'withdrawn') dealsWithdrawn += 1
    }
  }

  return {
    events,
    dealsLinked: dealIds.length,
    dealsWon,
    dealsLost,
    dealsWithdrawn,
  }
}
