import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

type Client = SupabaseClient<Database>

/**
 * storage_path is the bucket object key, not a folder.
 * Owner change must not rewrite it — a file uploaded under deals/… stays there
 * after demotion, and a tenders/… path stays as well.
 */
export async function demoteTenderDocumentsToDeal(
  supabase: Client,
  args: { organizationId: string; dealId: string; tenderId: string },
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('deal_documents')
    .select('id')
    .eq('tender_id', args.tenderId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }

  const now = new Date().toISOString()
  for (const row of data ?? []) {
    const { error: updateError } = await supabase
      .from('deal_documents')
      .update({ deal_id: args.dealId, tender_id: null, updated_at: now })
      .eq('id', row.id)
      .eq('organization_id', args.organizationId)
    if (updateError) return { success: false, error: updateError.message }
  }

  return { success: true }
}
