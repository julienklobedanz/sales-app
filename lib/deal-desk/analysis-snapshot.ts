import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

import { RFP_COCKPIT_ENGINE_VERSION_CURRENT } from '@/lib/deals/rfp-cockpit-metrics'

/** Persistiertes Analyse-JSON in `deal_desk_projects.analysis_snapshot`. */
export type PersistedDealDeskAnalysisSnapshot = DealDeskMockAnalysis & {
  requirements?: ExtractedRfpRequirement[]
  coverage?: RfpCoverageRow[]
  /** ISO-Zeitpunkt der Analyse (Cockpit-Staleness). */
  analyzedAt?: string
  /** 2 = judgeRfpRelevance + zentrale Threshold (Phase 6+); 1 = Legacy. */
  engineVersion?: number
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
  analyzedAt?: string
  engineVersion?: number
}): PersistedDealDeskAnalysisSnapshot {
  return {
    ...input.snapshot,
    requirements: input.requirements,
    coverage: input.coverage,
    analyzedAt: input.analyzedAt ?? new Date().toISOString(),
    engineVersion: input.engineVersion ?? 1,
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
