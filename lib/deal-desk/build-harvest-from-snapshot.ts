import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import type { ReferenceIncubatorHarvest } from '@/lib/deal-desk/reference-incubator-mock'

function firstSentence(text: string, max = 320): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const last = cut.lastIndexOf('.')
  return last > 80 ? cut.slice(0, last + 1) : `${cut}…`
}

/**
 * Leitet Inkubator-/Referenz-Felder aus dem echten Deal-Desk-Analyse-Snapshot ab.
 */
export function buildHarvestFromAnalysis(analysis: DealDeskMockAnalysis): ReferenceIncubatorHarvest {
  const customerName = analysis.customerName?.trim() || 'Kunde'

  const challengeFromFlags = analysis.redFlags
    .map((f) => f.excerpt)
    .filter(Boolean)
    .join(' ')
  const challengeFromReqs = analysis.draftRows
    .map((r) => r.requirement)
    .slice(0, 2)
    .join(' ')

  const challenge = firstSentence(
    challengeFromFlags || challengeFromReqs || analysis.icpSummary,
    520
  )

  const answerParts = analysis.draftRows
    .filter((r) => r.answer?.trim())
    .map((r) => r.answer!.trim())
    .slice(0, 4)
  const solution = firstSentence(
    answerParts.length > 0
      ? answerParts.join(' ')
      : analysis.icpSummary || 'Lösung wird aus RFP-Kontext und internen Referenzen abgeleitet.',
    620
  )

  const topMatch = analysis.draftRows.find((r) => r.reference)
  const industry = analysis.icpFitLabel

  const matchedCount = analysis.draftRows.filter((r) => r.reference).length
  const reqCount = analysis.draftRows.length

  return {
    companyName: customerName,
    logoUrl: topMatch?.reference?.logoUrl ?? null,
    website: customerName.toLowerCase().replace(/\s+/g, '-') + '.com',
    industry: industry || 'Aus RFP abgeleitet',
    headquarters: 'Aus Unterlagen',
    employeeCount: '—',
    challenge,
    solution,
    projectIndustry: industry || 'Siehe ICP-Fit',
    projectDuration: reqCount > 0 ? `${reqCount} Anforderungen analysiert` : '—',
    projectVolume:
      matchedCount > 0
        ? `${matchedCount} Referenz-Matches · Win-Score ${analysis.winProbability}%`
        : `Win-Score ${analysis.winProbability}% · Referenzen prüfen`,
  }
}

export type DealDeskReferencePrefill = {
  title: string
  summary: string
  customer_challenge: string
  our_solution: string
  industry: string | null
}

export function buildReferencePrefillFromAnalysis(
  analysis: DealDeskMockAnalysis,
  projectName: string
): DealDeskReferencePrefill {
  const harvest = buildHarvestFromAnalysis(analysis)
  return {
    title: `${harvest.companyName} — ${projectName}`.slice(0, 200),
    summary: analysis.icpSummary.slice(0, 500),
    customer_challenge: harvest.challenge,
    our_solution: harvest.solution,
    industry: harvest.industry !== 'Aus RFP abgeleitet' ? harvest.industry : null,
  }
}
