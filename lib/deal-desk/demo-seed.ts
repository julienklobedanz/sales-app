import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { buildDemoDealDeskAnalysis } from '@/lib/deal-desk/mock-analysis'
import { defaultWorkspaceState } from '@/lib/deal-desk/workspace-state'
import { persistNormalizedWorkspace } from '@/lib/deal-desk/workspace-persistence'

export const DEMO_SEED_PROJECT_NAME = 'Cloud Service Provider RFP India'
export const DEMO_SEED_FILE_NAMES = ['Cloud Service Provider RFP India.pdf']

export async function seedDealDeskDemoProject(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<{ projectId: string } | { error: string }> {
  const analysis = buildDemoDealDeskAnalysis(DEMO_SEED_FILE_NAMES)
  analysis.customerName = 'Logistik AG Schweiz'

  const workspace = defaultWorkspaceState(analysis.redFlags, { useDemoBidTeam: true })

  const { data, error } = await supabase
    .from('deal_desk_projects')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      project_name: DEMO_SEED_PROJECT_NAME,
      customer_name: analysis.customerName,
      analysis_status: 'completed',
      analysis_snapshot: analysis,
      analysis_source: 'mock',
      win_probability: analysis.winProbability,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return { error: error?.message ?? 'Seed fehlgeschlagen.' }
  }

  const projectId = data.id as string
  await persistNormalizedWorkspace(supabase, projectId, organizationId, workspace)
  await supabase.from('deal_desk_documents').insert({
    project_id: projectId,
    organization_id: organizationId,
    file_name: DEMO_SEED_FILE_NAMES[0]!,
    extract_status: 'skipped',
    sort_order: 0,
  })

  return { projectId }
}
