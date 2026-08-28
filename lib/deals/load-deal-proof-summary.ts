import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

export type DealProofSummary = {
  count: number
  bestScore: number | null
}

export async function loadDealProofSummary(
  supabase: SupabaseClient<Database>,
  dealIds: string[],
): Promise<Record<string, DealProofSummary>> {
  const summary: Record<string, DealProofSummary> = {}
  for (const id of dealIds) {
    summary[id] = { count: 0, bestScore: null }
  }
  if (dealIds.length === 0) return summary

  const { data: rows } = await supabase
    .from('deal_references')
    .select('deal_id, similarity_score')
    .in('deal_id', dealIds)

  for (const row of rows ?? []) {
    const current = summary[row.deal_id]
    if (!current) continue
    current.count += 1
    const score = row.similarity_score
    if (typeof score === 'number' && !Number.isNaN(score)) {
      if (current.bestScore == null || score > current.bestScore) {
        current.bestScore = score
      }
    }
  }

  return summary
}
