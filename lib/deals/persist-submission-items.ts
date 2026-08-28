import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { buildExtractedSubmissionItemSourceKey } from '@/lib/deals/submission-item-source-key'
import type { ExtractedSubmissionItem } from '@/lib/deals/submission-items-schema'

type Client = SupabaseClient<Database>

export type SubmissionItemsPersistResult =
  | { count: number; low: number }
  | { error: string }

/**
 * Schreibt Kandidaten an das Quelldokument. Setzt deadline_id nicht.
 */
export async function persistExtractedSubmissionItems(
  supabase: Client,
  args: {
    organizationId: string
    sourceDocumentId: string
    items: ExtractedSubmissionItem[]
  },
): Promise<SubmissionItemsPersistResult> {
  let count = 0
  let low = 0
  for (const [index, item] of args.items.entries()) {
    const confidence = item.confidence === 'low' ? 'low' : 'high'
    const matchSource = item.matchSource === 'model' ? 'model' : 'pattern'
    if (confidence === 'low') low += 1
    const { error } = await supabase.rpc('upsert_extracted_submission_item', {
      p_organization_id: args.organizationId,
      p_source_document_id: args.sourceDocumentId,
      p_identifier: item.identifier ?? '',
      p_title: item.title,
      p_source_key: buildExtractedSubmissionItemSourceKey(args.sourceDocumentId, item),
      p_sort_order: index,
      p_confidence: confidence,
      p_match_source: matchSource,
    })
    if (error) return { error: error.message }
    count += 1
  }

  return { count, low }
}
