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
}

export async function rpcMatchReferences(
  supabase: SupabaseClient,
  params: {
    queryEmbedding: number[]
    matchThreshold: number
    matchCount: number
    organizationId: string
    salesVisibleOnly: boolean
  }
): Promise<{ rows: MatchReferencesRpcRow[]; error?: string }> {
  const { data: rows, error: rpcError } = await supabase.rpc('match_references', {
    query_embedding: params.queryEmbedding,
    match_threshold: params.matchThreshold,
    match_count: params.matchCount,
    p_organization_id: params.organizationId,
    p_sales_visible_only: params.salesVisibleOnly,
  })

  if (rpcError) {
    return { rows: [], error: rpcError.message }
  }

  const list = (rows ?? []) as MatchReferencesRpcRow[]
  return { rows: list }
}
