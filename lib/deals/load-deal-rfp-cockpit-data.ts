import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { PersistedDealDeskAnalysisSnapshot } from '@/lib/deal-desk/analysis-snapshot'
import { loadOrgComplianceDocsForDelivery } from '@/lib/deal-desk/load-org-delivery-context'
import type { WinProbabilityBreakdown } from '@/lib/deal-desk/compute-delivery-win-probability'
import type { DealDeskDraftRow } from '@/lib/deal-desk/mock-analysis'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import type { EligibilityAssessment, EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'
import { compareEligibilityCriteria } from '@/lib/deals/compare-eligibility-criteria'
import { isIcpDefinitionEmpty, scoreIcpRubrik, type IcpRubrikScore } from '@/lib/deals/icp-rubric'
import { loadDealRfpRisksData, type DealRfpRisksData } from '@/lib/deals/load-deal-rfp-risks-data'
import type { RfpVerdict } from '@/lib/rfp-relevance'
import {
  loadOrgCapabilitySettings,
  loadOrgReferenceCount,
} from '@/lib/organizations/capability-profile'

import {
  computeRequirementCoveragePercent,
  isRfpMetricsStale,
  resolveBidRecommendation,
} from './rfp-cockpit-metrics'
import {
  buildRfpStammdatenRows,
  type RfpStammdatenRow,
} from './build-rfp-stammdaten-rows'
import { buildRequestedEvidenceGaps, type RequestedEvidenceGapItem } from './build-requested-evidence-gaps'
import { normalizeExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { TenderLot } from '@/lib/deals/tender-lots'

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
  icpRubrik: IcpRubrikScore | null
  requirementsCount: number
  eligibilityCriteria: EligibilityCriterion[]
  eligibilityAssessment: EligibilityAssessment | null
  capabilityProfileEmpty: boolean
  risks: DealRfpRisksData | null
  draftRows: DealDeskDraftRow[]
  stammdatenRows: RfpStammdatenRow[]
  executiveBriefing: DealDeskExecutiveBriefingFields
  tenderLots: TenderLot[]
  recommendation: ReturnType<typeof resolveBidRecommendation>
  requestedEvidenceGaps: RequestedEvidenceGapItem[]
}

export async function loadDealRfpCockpitData(
  supabase: SupabaseClient,
  organizationId: string,
  dealId: string,
  dealContext?: {
    industry?: string | null
    volume?: string | null
    title?: string | null
  }
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
  const eligibilityCriteria: EligibilityCriterion[] = Array.isArray(snap.eligibilityCriteria)
    ? snap.eligibilityCriteria
    : []
  const rfpVerdicts: Record<string, RfpVerdict> | null =
    snap.rfpVerdicts && typeof snap.rfpVerdicts === 'object' ? snap.rfpVerdicts : null

  const [orgSettings, complianceDocs, referenceCount, risks] = await Promise.all([
    loadOrgCapabilitySettings(supabase, organizationId),
    loadOrgComplianceDocsForDelivery(supabase, organizationId),
    loadOrgReferenceCount(supabase, organizationId),
    loadDealRfpRisksData(supabase, organizationId, String(project.id), snap),
  ])

  const eligibilityAssessment =
    eligibilityCriteria.length > 0
      ? compareEligibilityCriteria(eligibilityCriteria, {
          profile: orgSettings.capabilityProfile,
          complianceDocs,
          referenceCount,
        })
      : null

  const icpRubrik = !isIcpDefinitionEmpty(orgSettings.icpDefinition)
    ? scoreIcpRubrik(orgSettings.icpDefinition, {
        industry: dealContext?.industry,
        volume: dealContext?.volume,
        title: dealContext?.title,
      })
    : null

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

  const capabilityProfileEmpty =
    !orgSettings.capabilityProfile.employeeCount &&
    !orgSettings.capabilityProfile.annualRevenueEur &&
    !orgSettings.capabilityProfile.regions?.length &&
    !orgSettings.capabilityProfile.certifiedRoles?.length

  const executiveBriefing = normalizeExecutiveBriefingFields(snap.executiveBriefing)

  return {
    projectId: String(project.id),
    analyzedAt,
    engineVersion,
    hasAnalysis,
    isStale,
    winProbability,
    winProbabilityBreakdown: snap.winProbabilityBreakdown ?? null,
    coveragePercent: computeRequirementCoveragePercent(
      requirements,
      coverage,
      undefined,
      engineVersion >= 2 ? rfpVerdicts : null
    ),
    icpFitLabel: snap.icpFitLabel ?? null,
    icpSummary: icpRubrik?.summary ?? snap.icpSummary ?? null,
    icpRubrik,
    requirementsCount: requirements.length,
    eligibilityCriteria,
    eligibilityAssessment,
    capabilityProfileEmpty,
    risks,
    draftRows: Array.isArray(snap.draftRows) ? snap.draftRows : [],
    stammdatenRows: buildRfpStammdatenRows(snap),
    executiveBriefing,
    tenderLots: Array.isArray(snap.tenderLots) ? snap.tenderLots : [],
    recommendation: resolveBidRecommendation({
      winProbability,
      hasAnalysis,
      isStale,
    }),
    requestedEvidenceGaps: buildRequestedEvidenceGaps({
      eligibilityAssessment,
      executiveBriefing,
      complianceDocs,
    }),
  }
}
