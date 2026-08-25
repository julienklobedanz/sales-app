import { eligibilityVerdictLabel } from '@/lib/deals/compare-eligibility-criteria'
import type { EligibilityAssessment } from '@/lib/deals/eligibility-criteria-schema'
import { draftRowStatus } from '@/lib/deals/sort-draft-rows-by-criticality'

type SummaryDraftRow = { reference?: unknown; answer?: string | null }
type SummaryRisks = { redFlags: unknown[]; smeOpenCount: number }

export type DealAusschreibungSummary = {
  eligibility: string
  drafts: string
  risks: string
  documents: string
  hasAnalysis: boolean
}

export function buildDealAusschreibungSummary(input: {
  documentCount: number
  data: {
    hasAnalysis: boolean
    isStale: boolean
    eligibilityAssessment: EligibilityAssessment | null
    draftRows: SummaryDraftRow[]
    risks: SummaryRisks | null
  } | null
}): DealAusschreibungSummary {
  const data = input.data
  const hasAnalysis = Boolean(data?.hasAnalysis && !data.isStale)
  const draftsCovered = data
    ? data.draftRows.filter((row) => draftRowStatus(row) === 'ready').length
    : 0
  const draftsTotal = data?.draftRows.length ?? 0
  const risksCount = data?.risks ? data.risks.redFlags.length : 0
  const eligibility =
    hasAnalysis && data?.eligibilityAssessment
      ? eligibilityVerdictLabel(data.eligibilityAssessment.verdict)
      : '—'

  return {
    eligibility,
    drafts: draftsTotal > 0 ? `${draftsCovered}/${draftsTotal}` : '—',
    risks: risksCount > 0 ? String(risksCount) : '—',
    documents: String(input.documentCount),
    hasAnalysis,
  }
}
