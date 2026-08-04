import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type MatchReferencesRpcRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
  company_name: string | null
  volume_eur: string | null
  status: string | null
  created_at: string | null
}

/** Optionale strukturelle Vorfilter (Stufe C). Jeweils weggelassen/NULL = kein Filter. */
export type MatchReferencesRpcFilters = {
  industries?: string[] | null
  minVolume?: number | null
  maxVolume?: number | null
  statuses?: string[] | null
  /** ISO-Timestamp; nur Referenzen mit created_at >= createdAfter. */
  createdAfter?: string | null
}

export async function rpcMatchReferences(
  supabase: SupabaseClient,
  params: {
    queryEmbedding: number[]
    matchThreshold: number
    matchCount: number
    organizationId: string
    salesVisibleOnly: boolean
    filters?: MatchReferencesRpcFilters
  },
): Promise<{ rows: MatchReferencesRpcRow[]; error?: string }> {
  const f = params.filters
  const { data: rows, error: rpcError } = await supabase.rpc('match_references', {
    query_embedding: params.queryEmbedding,
    match_threshold: params.matchThreshold,
    match_count: params.matchCount,
    p_organization_id: params.organizationId,
    p_sales_visible_only: params.salesVisibleOnly,
    p_industries: f?.industries?.length ? f.industries : null,
    p_min_volume: f?.minVolume ?? null,
    p_max_volume: f?.maxVolume ?? null,
    p_statuses: f?.statuses?.length ? f.statuses : null,
    p_created_after: f?.createdAfter ?? null,
  })

  if (rpcError) {
    return { rows: [], error: rpcError.message }
  }

  const list = (rows ?? []) as MatchReferencesRpcRow[]
  return { rows: list }
}
