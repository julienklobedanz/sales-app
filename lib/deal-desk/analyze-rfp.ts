import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { analyzeBenchmarkRisk } from '@/lib/deal-desk/benchmark-risk-analysis'
import { analyzeDealDeskRisks } from '@/lib/deal-desk/deal-desk-risk-analysis'
import { extractExecutiveBriefingFromRfp } from '@/lib/deal-desk/executive-briefing-extract'
import { mapRfpAnalysisToDealDeskSnapshot } from '@/lib/deal-desk/map-rfp-to-desk'
import type { DealDeskMockAnalysis, DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'
import { enrichRedFlagsWithDocuments } from '@/lib/deal-desk/red-flag-document-match'
import { buildRfpCoverageReport, type RfpCoverageRow } from '@/lib/rfp-coverage'
import { extractRequirementsFromRfpText, type ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import { extractTimelineFromRfpText } from '@/lib/rfp-timeline'
import { extractEligibilityCriteriaFromRfpText } from '@/lib/deals/extract-eligibility-criteria'
import type { EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'
import { isOpenAiQuotaErrorMessage } from '@/lib/openai-api-errors'

export type AnalyzeRfpDealContext = {
  title: string | null
  industry: string | null
  volume: string | null
}

export type AnalyzeRfpProjectDocument = {
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
}

export type AnalyzeRfpResult = {
  snapshot: DealDeskMockAnalysis
  requirements: ExtractedRfpRequirement[]
  coverage: RfpCoverageRow[]
  eligibilityCriteria: EligibilityCriterion[]
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
  input: AnalyzeRfpInput
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

  const extracted = await extractRequirementsFromRfpText(apiKey, mergedText)
  if ('error' in extracted) {
    return { error: extracted.error, isQuotaError: quotaFromError(extracted.error) }
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

  const coverage = await buildRfpCoverageReport(supabase, {
    apiKey,
    organizationId,
    salesVisibleOnly,
    deal: deal ?? {
      title: projectName,
      industry: null,
      volume: null,
    },
    requirements: extracted.requirements,
  })

  const [riskResult, briefingResult, benchmarkRiskResult] = await Promise.all([
    analyzeDealDeskRisks(apiKey, mergedText, projectName, fileNames),
    extractExecutiveBriefingFromRfp(apiKey, mergedText, projectName),
    analyzeBenchmarkRisk(apiKey, mergedText, fileNames),
  ])

  if ('error' in riskResult) {
    return { error: riskResult.error, isQuotaError: quotaFromError(riskResult.error) }
  }
  if ('error' in briefingResult) {
    return { error: briefingResult.error, isQuotaError: quotaFromError(briefingResult.error) }
  }
  if ('error' in benchmarkRiskResult) {
    return { error: benchmarkRiskResult.error, isQuotaError: quotaFromError(benchmarkRiskResult.error) }
  }

  const linkedRedFlags = enrichRedFlagsWithDocuments(riskResult.redFlags, projectDocuments)

  const snapshot = await mapRfpAnalysisToDealDeskSnapshot({
    apiKey,
    projectName,
    fileNames,
    requirements: extracted.requirements,
    coverage,
    risk: { ...riskResult, redFlags: linkedRedFlags },
    executiveBriefing: briefingResult,
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
  }
}
