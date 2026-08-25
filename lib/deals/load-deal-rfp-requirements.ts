import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

export type DealRfpRequirementRow = {
  id: string
  text: string
  category: string | null
  sourceDocumentId: string
  sourceFileName: string | null
}

export function attachRequirementSourceNames(
  rows: Array<{
    id: string
    text: string
    category: string | null
    source_document_id: string
  }>,
  documents: Array<{ id: string; file_name: string }>,
): DealRfpRequirementRow[] {
  const names = new Map(documents.map((doc) => [doc.id, doc.file_name]))
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    category: row.category,
    sourceDocumentId: row.source_document_id,
    sourceFileName: names.get(row.source_document_id) ?? null,
  }))
}

export async function loadDealRfpRequirements(
  supabase: SupabaseClient<Database>,
  args: {
    dealId: string
    organizationId: string
    documents: Array<{ id: string; file_name: string }>
  },
): Promise<DealRfpRequirementRow[]> {
  const { data, error } = await supabase
    .from('deal_rfp_requirements')
    .select('id, text, category, source_document_id')
    .eq('deal_id', args.dealId)
    .eq('organization_id', args.organizationId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return attachRequirementSourceNames(data, args.documents)
}
