import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { PersistedDealDeskAnalysisSnapshot } from '@/lib/deal-desk/analysis-snapshot'
import type { WinProbabilityBreakdown } from '@/lib/deal-desk/compute-delivery-win-probability'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

import {
  computeRequirementCoveragePercent,
  isRfpMetricsStale,
  resolveBidRecommendation,
} from './rfp-cockpit-metrics'

export type DealRfpCockpitData = {
  projectId: string
  analyzedAt: string | null
  engineVersion: number
  hasAnalysis: boolean
  isStale: boolean
  winProbability: number
  winProbabilityBreakdown: WinProbabilityBreakdown | null
  coveragePercent: number
  icpFitLabel: string | null
  icpSummary: string | null
  requirementsCount: number
  recommendation: ReturnType<typeof resolveBidRecommendation>
}

export async function loadDealRfpCockpitData(
  supabase: SupabaseClient,
  organizationId: string,
  dealId: string
): Promise<DealRfpCockpitData | null> {
  const { data: project, error } = await supabase
    .from('deal_desk_projects')
    .select('id, analysis_status, analysis_snapshot, updated_at')
    .eq('organization_id', organizationId)
    .eq('deal_id', dealId)
    .eq('analysis_status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !project?.id) return null

  const raw = project.analysis_snapshot
  if (!raw || typeof raw !== 'object') return null

  const snap = raw as PersistedDealDeskAnalysisSnapshot & {
    analyzedAt?: string
    engineVersion?: number
  }

  const requirements: ExtractedRfpRequirement[] = Array.isArray(snap.requirements)
    ? snap.requirements
    : []
  const coverage: RfpCoverageRow[] = Array.isArray(snap.coverage) ? snap.coverage : []

  const analyzedAt =
    (typeof snap.analyzedAt === 'string' && snap.analyzedAt) ||
    (typeof project.updated_at === 'string' ? project.updated_at : null)
  const engineVersion = typeof snap.engineVersion === 'number' ? snap.engineVersion : 1
  const hasAnalysis = requirements.length > 0 && coverage.length > 0
  const isStale = isRfpMetricsStale({ analyzedAt, engineVersion })

  const winProbability =
    typeof snap.winProbability === 'number' && !Number.isNaN(snap.winProbability)
      ? snap.winProbability
      : 0

  return {
    projectId: String(project.id),
    analyzedAt,
    engineVersion,
    hasAnalysis,
    isStale,
    winProbability,
    winProbabilityBreakdown: snap.winProbabilityBreakdown ?? null,
    coveragePercent: computeRequirementCoveragePercent(requirements, coverage),
    icpFitLabel: snap.icpFitLabel ?? null,
    icpSummary: snap.icpSummary ?? null,
    requirementsCount: requirements.length,
    recommendation: resolveBidRecommendation({
      winProbability,
      hasAnalysis,
      isStale,
    }),
  }
}
