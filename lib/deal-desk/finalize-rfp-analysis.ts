import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { AnalyzeRfpResult } from '@/lib/deal-desk/analyze-rfp'
import {
  toPersistedAnalysisSnapshot,
  type PersistedDealDeskAnalysisSnapshot,
} from '@/lib/deal-desk/analysis-snapshot'
import { persistNormalizedWorkspace } from '@/lib/deal-desk/workspace-persistence'
import { workspaceFromRfpSnapshot } from '@/lib/deal-desk/workspace-from-snapshot'
import { RFP_COCKPIT_ENGINE_VERSION_CURRENT } from '@/lib/deals/rfp-cockpit-metrics'
import type { RfpVerdict } from '@/lib/rfp-relevance'

export type FinalizeRfpAnalysisInput = {
  projectId: string
  organizationId: string
  dealId?: string | null
  analyzed: AnalyzeRfpResult & { rfpVerdicts?: Record<string, RfpVerdict> }
}

/**
 * Persistiert Snapshot (engine v2), normalisierte Red Flags + SME-Routes, optional `is_rfp_mode`.
 * Einziger Schreibpfad für RFP-Gate nach erfolgreicher Analyse.
 */
export async function finalizeRfpAnalysis(
  supabase: SupabaseClient,
  input: FinalizeRfpAnalysisInput
): Promise<PersistedDealDeskAnalysisSnapshot> {
  const { projectId, organizationId, dealId, analyzed } = input

  const workspace = workspaceFromRfpSnapshot(analyzed.snapshot)
  const persistedSnapshot = toPersistedAnalysisSnapshot({
    snapshot: analyzed.snapshot,
    requirements: analyzed.requirements,
    coverage: analyzed.coverage,
    eligibilityCriteria: analyzed.eligibilityCriteria,
    rfpVerdicts: analyzed.rfpVerdicts,
    engineVersion: RFP_COCKPIT_ENGINE_VERSION_CURRENT,
  })

  await persistNormalizedWorkspace(supabase, projectId, organizationId, workspace)

  if (dealId) {
    const { error } = await supabase
      .from('deals')
      .update({ is_rfp_mode: true })
      .eq('id', dealId)
      .eq('organization_id', organizationId)
    if (error) {
      console.error('[finalizeRfpAnalysis/is_rfp_mode]', error.message)
    }
  }

  return persistedSnapshot
}
