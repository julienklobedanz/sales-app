import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { buildRfpCoverageReport, type RfpCoverageRow } from '@/lib/rfp-coverage'
import { judgeRfpRelevance, type RfpVerdict } from '@/lib/rfp-relevance'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

type DealContext = {
  title: string | null
  industry: string | null
  volume: string | null
}

export type RfpCoveragePipelineResult = {
  coverage: RfpCoverageRow[]
  verdicts: Record<string, RfpVerdict>
}

/**
 * Einheitliche Coverage-Pipeline: Embedding-Match + LLM-Relevanz-Verdikt (Engine v2).
 */
export async function buildRfpCoverageWithRelevance(
  supabase: SupabaseClient,
  params: {
    apiKey: string
    organizationId: string
    salesVisibleOnly: boolean
    deal: DealContext | null
    requirements: ExtractedRfpRequirement[]
  },
): Promise<RfpCoveragePipelineResult> {
  const coverage = await buildRfpCoverageReport(supabase, params)

  const verdicts = await judgeRfpRelevance(
    params.apiKey,
    coverage.map((row) => ({
      requirementId: row.requirementId,
      requirementText: row.requirementText,
      candidates: row.matches.slice(0, 3).map((m) => ({
        id: m.id,
        title: m.title,
        summary: m.summary,
      })),
    })),
  )

  return { coverage, verdicts }
}
