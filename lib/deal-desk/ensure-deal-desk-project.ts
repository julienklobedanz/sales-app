import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveDealDeskProject } from '@/lib/deal-desk/resolve-deal-desk-project'

/** Liefert das Deal-Desk-Projekt für einen Deal oder legt eines an. */
export async function ensureDealDeskProjectForDeal(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    userId: string
    dealId: string
    projectName: string
  },
): Promise<{ projectId: string } | { error: string }> {
  const { organizationId, userId, dealId, projectName } = params

  const { data: existingRows, error: findError } = await supabase
    .from('deal_desk_projects')
    .select('id, archived_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('deal_id', dealId)

  if (findError) return { error: findError.message }
  const existing = resolveDealDeskProject(existingRows ?? [])
  if (existing?.id) return { projectId: String(existing.id) }

  const { data: created, error: insertError } = await supabase
    .from('deal_desk_projects')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      deal_id: dealId,
      project_name: projectName.trim() || 'RFP-Analyse',
      analysis_status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !created?.id) {
    return {
      error: insertError?.message ?? 'Deal-Desk-Projekt konnte nicht angelegt werden.',
    }
  }

  return { projectId: String(created.id) }
}
