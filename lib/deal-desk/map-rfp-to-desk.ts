import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  DealDeskMockAnalysis,
  DealDeskSmeTask,
  DealDeskTimelineItem,
} from '@/lib/deal-desk/mock-analysis'
import type { DealDeskRiskAnalysisResult } from '@/lib/deal-desk/deal-desk-risk-analysis'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import {
  computeDeliveryWinProbability,
  DESK_COVER_THRESHOLD,
  formatWinProbabilityBreakdownSummary,
} from '@/lib/deal-desk/compute-delivery-win-probability'
import { loadOrgComplianceDocsForDelivery } from '@/lib/deal-desk/load-org-delivery-context'
import { generateDealDeskAnswerForRequirement } from '@/lib/deal-desk/generate-desk-answer'

export { DESK_COVER_THRESHOLD }

const SME_CATEGORIES = new Set(['legal', 'compliance', 'pricing', 'finance', 'security'])

function buildSmeTasks(
  coverage: RfpCoverageRow[],
  requirements: ExtractedRfpRequirement[]
): DealDeskSmeTask[] {
  const tasks: DealDeskSmeTask[] = []
  let n = 0
  for (const row of coverage) {
    const best = row.matches[0]
    const hasMatch = best && best.similarity >= DESK_COVER_THRESHOLD
    const cat = (row.category ?? '').toLowerCase()
    if (!hasMatch || SME_CATEGORIES.has(cat)) {
      tasks.push({
        id: `sme-${row.requirementId}`,
        question: hasMatch
          ? `${row.requirementText.slice(0, 200)} — fachliche Klärung (${row.category ?? 'Allgemein'})`
          : `Keine interne Referenz: ${row.requirementText.slice(0, 180)}`,
        category: row.category ?? 'Allgemein',
        dueInDays: 3 + (n % 5),
        contextExcerpt: row.requirementText.slice(0, 320),
        contextPageHint: row.category ? `Anforderung · ${row.category}` : 'RFP-Anforderung',
      })
      n++
    }
  }
  for (const req of requirements) {
    if (tasks.length >= 8) break
    if (!coverage.some((c) => c.requirementId === req.id)) {
      tasks.push({
        id: `sme-${req.id}`,
        question: req.text.slice(0, 220),
        category: req.category ?? 'Allgemein',
        dueInDays: 5,
        contextExcerpt: req.text.slice(0, 320),
        contextPageHint: req.category ? `Anforderung · ${req.category}` : 'RFP-Anforderung',
      })
    }
  }
  return tasks.slice(0, 8)
}

async function enrichLogoUrls(
  supabase: SupabaseClient,
  coverage: RfpCoverageRow[]
): Promise<Map<string, string | null>> {
  const ids = new Set<string>()
  for (const row of coverage) {
    const best = row.matches[0]
    if (best?.id) ids.add(best.id)
  }
  if (ids.size === 0) return new Map()

  const { data } = await supabase
    .from('references')
    .select('id, company_id, companies ( logo_url )')
    .in('id', Array.from(ids))

  const map = new Map<string, string | null>()
  for (const row of data ?? []) {
    const companies = row.companies as { logo_url?: string | null } | { logo_url?: string | null }[] | null
    const logo =
      companies && !Array.isArray(companies)
        ? companies.logo_url
        : Array.isArray(companies)
          ? companies[0]?.logo_url
          : null
    map.set(row.id as string, logo?.trim() ? logo : null)
  }
  return map
}

export async function mapRfpAnalysisToDealDeskSnapshot(params: {
  apiKey: string | null
  projectName: string
  fileNames: string[]
  requirements: ExtractedRfpRequirement[]
  coverage: RfpCoverageRow[]
  risk: DealDeskRiskAnalysisResult
  executiveBriefing: DealDeskExecutiveBriefingFields
  timelineItems: DealDeskTimelineItem[]
  organizationId: string
  supabase: SupabaseClient
}): Promise<DealDeskMockAnalysis> {
  const {
    apiKey,
    projectName,
    fileNames,
    requirements,
    coverage,
    risk,
    executiveBriefing,
    timelineItems,
    organizationId,
    supabase,
  } = params
  const primary = fileNames[0] ?? 'RFP-Paket'
  const docLabel =
    fileNames.length === 1
      ? primary
      : `${primary} + ${fileNames.length - 1} weitere`

  const logoByRef = await enrichLogoUrls(supabase, coverage)
  const complianceDocs = await loadOrgComplianceDocsForDelivery(supabase, organizationId)
  const winBreakdown = computeDeliveryWinProbability({
    requirements,
    coverage,
    complianceDocs,
    redFlags: risk.redFlags,
  })
  const winProbability = winBreakdown.finalScore

  const draftRows = await Promise.all(
    coverage.map(async (row) => {
      const best = row.matches[0]
      const hasMatch = best && best.similarity >= DESK_COVER_THRESHOLD && !row.embedError

      if (!hasMatch) {
        return {
          id: row.requirementId,
          requirement: row.requirementText,
          answer: null as string | null,
        }
      }

      let answer: string | null = null
      if (apiKey) {
        const generated = await generateDealDeskAnswerForRequirement(apiKey, {
          projectName,
          requirementText: row.requirementText,
          referenceTitle: best.title,
          companyName: best.companyName,
          matchPercent: Math.round(best.similarity * 100),
        })
        if ('text' in generated) answer = generated.text
      }

      return {
        id: row.requirementId,
        requirement: row.requirementText,
        answer,
        reference: {
          title: best.title,
          companyName: best.companyName ?? 'Referenz',
          logoUrl: logoByRef.get(best.id) ?? null,
          matchPercent: Math.round(best.similarity * 100),
        },
      }
    })
  )

  const smeTasks = buildSmeTasks(coverage, requirements)

  const matchedRows = draftRows.filter((r) => r.reference).length
  const icpSummary = [
    executiveBriefing.strategicAssessment?.trim() || risk.icpSummary,
    `${requirements.length} Anforderungen extrahiert.`,
    `Lieferfähigkeit (Win Score ${winProbability}%): ${formatWinProbabilityBreakdownSummary(winBreakdown)}.`,
    matchedRows > 0
      ? `${matchedRows} Referenz-Matches im Antwort-Entwurf (≥${Math.round(DESK_COVER_THRESHOLD * 100)} % Ähnlichkeit).`
      : 'Referenz-Matches für Antwort-Entwürfe prüfen.',
  ].join(' ')

  return {
    documentName: docLabel,
    documentNames: fileNames,
    customerName: risk.customerName,
    winProbability,
    winProbabilityBreakdown: winBreakdown,
    icpFitLabel: risk.icpFitLabel,
    icpSummary,
    executiveBriefing,
    redFlags: risk.redFlags,
    draftRows,
    smeTasks,
    timelineItems,
  }
}
