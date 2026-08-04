import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { defaultWorkspaceState } from '@/lib/deal-desk/workspace-state'
import { mergeWorkspaceWithNormalizedOverlay } from '@/lib/deal-desk/workspace-merge'
import { loadNormalizedWorkspaceOverlay } from '@/lib/deal-desk/workspace-persistence'

export type DealExecutiveBriefingContext = {
  projectId: string
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags: DealDeskRedFlag[]
}

function parseAnalysisSnapshot(raw: unknown): DealDeskMockAnalysis | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<DealDeskMockAnalysis>
  if (!o.customerName && !o.icpSummary && !o.executiveBriefing && !o.draftRows?.length) {
    return null
  }
  return o as DealDeskMockAnalysis
}

export async function loadDealExecutiveBriefingContext(
  supabase: SupabaseClient,
  organizationId: string,
  dealId: string,
): Promise<DealExecutiveBriefingContext | null> {
  const { data: project, error } = await supabase
    .from('deal_desk_projects')
    .select('id, project_name, analysis_snapshot, analysis_status')
    .eq('organization_id', organizationId)
    .eq('deal_id', dealId)
    .eq('analysis_status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !project?.id) return null

  const analysis = parseAnalysisSnapshot(project.analysis_snapshot)
  if (!analysis) return null

  const overlay = await loadNormalizedWorkspaceOverlay(
    supabase,
    String(project.id),
    organizationId,
  )
  const baseWorkspace = defaultWorkspaceState(analysis.redFlags ?? [])
  const workspace = mergeWorkspaceWithNormalizedOverlay(
    baseWorkspace,
    overlay,
    baseWorkspace.smeCustomExperts,
  )
  const redFlags: DealDeskRedFlag[] =
    workspace.redFlags.length > 0 ? workspace.redFlags : (analysis.redFlags ?? [])

  return {
    projectId: String(project.id),
    projectName: String(project.project_name ?? 'RFP'),
    analysis,
    redFlags,
  }
}
