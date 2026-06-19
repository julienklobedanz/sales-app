import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

/** Persistiertes Analyse-JSON in `deal_desk_projects.analysis_snapshot`. */
export type PersistedDealDeskAnalysisSnapshot = DealDeskMockAnalysis & {
  requirements?: ExtractedRfpRequirement[]
  coverage?: RfpCoverageRow[]
}

export type DealRfpSectionData = {
  projectId: string
  requirements: ExtractedRfpRequirement[]
  coverage: RfpCoverageRow[]
}

export function toPersistedAnalysisSnapshot(input: {
  snapshot: DealDeskMockAnalysis
  requirements: ExtractedRfpRequirement[]
  coverage: RfpCoverageRow[]
}): PersistedDealDeskAnalysisSnapshot {
  return {
    ...input.snapshot,
    requirements: input.requirements,
    coverage: input.coverage,
  }
}

export function extractDealRfpSectionData(
  projectId: string,
  raw: unknown
): DealRfpSectionData | null {
  if (!raw || typeof raw !== 'object') return null
  const snap = raw as PersistedDealDeskAnalysisSnapshot
  const requirements = Array.isArray(snap.requirements) ? snap.requirements : null
  const coverage = Array.isArray(snap.coverage) ? snap.coverage : null
  if (!requirements?.length || !coverage?.length) return null
  return { projectId, requirements, coverage }
}
