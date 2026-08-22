import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { analyzeBenchmarkRisk } from '@/lib/deal-desk/benchmark-risk-analysis'
import { analyzeDealDeskRisks } from '@/lib/deal-desk/deal-desk-risk-analysis'
import { extractExecutiveBriefingFromRfp } from '@/lib/deal-desk/executive-briefing-extract'
import { mapRfpAnalysisToDealDeskSnapshot } from '@/lib/deal-desk/map-rfp-to-desk'
import type {
  DealDeskMockAnalysis,
  DealDeskTimelineItem,
} from '@/lib/deal-desk/deal-analysis-types'
import { enrichRedFlagsWithDocuments } from '@/lib/deal-desk/red-flag-document-match'
import { buildRfpCoverageWithRelevance } from '@/lib/deals/rfp-coverage-pipeline'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { RfpVerdict } from '@/lib/rfp-relevance'
import {
  extractRequirementsFromRfpText,
  type ExtractedRfpRequirement,
} from '@/lib/rfp-requirements'
import { extractTimelineFromRfpText } from '@/lib/rfp-timeline'
import { extractEligibilityCriteriaFromRfpText } from '@/lib/deals/extract-eligibility-criteria'
import type { EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'
import { isOpenAiQuotaErrorMessage } from '@/lib/openai-api-errors'
import { buildEmptyDealDeskAnalysis } from '@/lib/deal-desk/deal-analysis-types'

type AnalyzeRfpDealContext = {
  title: string | null
  industry: string | null
  volume: string | null
}

type AnalyzeRfpProjectDocument = {
  id: string
  file_name: string
  storage_path: string | null
  mime_type: string | null
}

export type AnalyzeRfpInput = {
  apiKey: string
  supabase: SupabaseClient
  organizationId: string
  salesVisibleOnly: boolean
  projectName: string
  fileNames: string[]
  mergedText: string
  deal?: AnalyzeRfpDealContext | null
  projectDocuments?: AnalyzeRfpProjectDocument[]
  /** `quick` = Timeline + Eignung; `full` = komplette Pipeline. */
  stage?: 'quick' | 'full'
}

export type AnalyzeRfpResult = {
  snapshot: DealDeskMockAnalysis
  requirements: ExtractedRfpRequirement[]
  coverage: RfpCoverageRow[]
  eligibilityCriteria: EligibilityCriterion[]
  rfpVerdicts: Record<string, RfpVerdict>
  tenderLots: import('@/lib/deals/tender-lots').TenderLot[]
}

export type AnalyzeRfpError = { error: string; isQuotaError?: boolean }

function quotaFromError(error: string, explicit?: boolean): boolean {
  return Boolean(explicit) || isOpenAiQuotaErrorMessage(error)
}

/**
 * Einheitliche RFP-Analyse-Engine (Deal Desk + Deal-Detail-RFP).
 * Baut den vollen Snapshot inkl. Coverage, Requirements, Win-Score, Red Flags, Draft-Zeilen, SME-Tasks.
 */
export async function analyzeRfp(
  input: AnalyzeRfpInput,
): Promise<AnalyzeRfpResult | AnalyzeRfpError> {
  const {
    apiKey,
    supabase,
    organizationId,
    salesVisibleOnly,
    projectName,
    fileNames,
    mergedText,
    deal,
    projectDocuments = [],
    stage = 'full',
  } = input

  const timelineRes = await extractTimelineFromRfpText(apiKey, mergedText)
  let timelineItems: DealDeskTimelineItem[] = []
  if ('error' in timelineRes) {
    if (quotaFromError(timelineRes.error)) {
      return { error: timelineRes.error, isQuotaError: true }
    }
  } else {
    timelineItems = timelineRes.timelineItems
  }

  const eligibilityRes = await extractEligibilityCriteriaFromRfpText(apiKey, mergedText)
  let eligibilityCriteria: EligibilityCriterion[] = []
  if ('error' in eligibilityRes) {
    if (quotaFromError(eligibilityRes.error)) {
      return { error: eligibilityRes.error, isQuotaError: true }
    }
  } else {
    eligibilityCriteria = eligibilityRes.criteria
  }

  if (stage === 'quick') {
    const snapshot = buildEmptyDealDeskAnalysis(fileNames, deal?.title ?? projectName)
    snapshot.timelineItems = timelineItems
    return {
      snapshot,
      requirements: [],
      coverage: [],
      eligibilityCriteria,
      rfpVerdicts: {},
      tenderLots: [],
    }
  }

  const extracted = await extractRequirementsFromRfpText(apiKey, mergedText)
  if ('error' in extracted) {
    return { error: extracted.error, isQuotaError: quotaFromError(extracted.error) }
  }

  const { coverage, verdicts: rfpVerdicts } = await buildRfpCoverageWithRelevance(
    supabase,
    {
      apiKey,
      organizationId,
      salesVisibleOnly,
      deal: deal ?? {
        title: projectName,
        industry: null,
        volume: null,
      },
      requirements: extracted.requirements,
    },
  )

  const [riskResult, briefingResult, benchmarkRiskResult] = await Promise.all([
    analyzeDealDeskRisks(apiKey, mergedText, projectName, fileNames),
    extractExecutiveBriefingFromRfp(apiKey, mergedText, projectName),
    analyzeBenchmarkRisk(apiKey, mergedText, fileNames),
  ])

  if ('error' in riskResult) {
    return { error: riskResult.error, isQuotaError: quotaFromError(riskResult.error) }
  }
  if ('error' in briefingResult) {
    return {
      error: briefingResult.error,
      isQuotaError: quotaFromError(briefingResult.error),
    }
  }
  if ('error' in benchmarkRiskResult) {
    return {
      error: benchmarkRiskResult.error,
      isQuotaError: quotaFromError(benchmarkRiskResult.error),
    }
  }

  const linkedRedFlags = enrichRedFlagsWithDocuments(
    riskResult.redFlags,
    projectDocuments,
  )

  const snapshot = await mapRfpAnalysisToDealDeskSnapshot({
    apiKey,
    projectName,
    fileNames,
    requirements: extracted.requirements,
    coverage,
    rfpVerdicts,
    risk: { ...riskResult, redFlags: linkedRedFlags },
    executiveBriefing: briefingResult.briefing,
    benchmarkRisk: benchmarkRiskResult,
    timelineItems,
    organizationId,
    supabase,
  })

  return {
    snapshot,
    requirements: extracted.requirements,
    coverage,
    eligibilityCriteria,
    rfpVerdicts,
    tenderLots: briefingResult.tenderLots,
  }
}
