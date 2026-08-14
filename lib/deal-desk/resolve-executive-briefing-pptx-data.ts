import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import {
  hasSuitabilityContent,
  resolveDomainTags,
  resolveSuitabilityCriteria,
} from '@/lib/deal-desk/deal-desk-bid-enrichment'
import { buildHeroKeyTakeaways } from '@/lib/deal-desk/hero-key-takeaways'
import { formatDealDeadlineLabel } from '@/lib/deal-desk/timeline-display'
import {
  winProbabilityRecommendationLabel,
  winProbabilityTone,
} from '@/lib/deal-desk/win-probability'

function formatDateDe(iso: string): string {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(iso.trim())) return iso.trim()
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function timelineDateByPattern(
  items: DealDeskMockAnalysis['timelineItems'],
  patterns: RegExp[],
): string | null {
  const hit = items.find((t) => patterns.some((p) => p.test(t.title)))
  return hit?.dueDate ? formatDateDe(hit.dueDate) : null
}

function dash(value: string | null | undefined): string {
  const t = String(value ?? '').trim()
  return t || '—'
}

export type ExecutiveBriefingPptxData = {
  customerName: string
  classification: string
  recommendation: string
  winProbability: number
  strategicAssessment: string
  techFocus: string
  governance: string
  volume: string
  runtime: string
  bidInvestment: string
  submissionDeadline: string
  capabilityBullets: string[]
  deadlineBullets: string[]
  smeBullets: string[]
  riskBullets: string[]
}

export function resolveExecutiveBriefingPptxData(params: {
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags?: DealDeskRedFlag[]
}): ExecutiveBriefingPptxData {
  const { analysis, redFlags = analysis.redFlags ?? [] } = params
  const briefing = analysis.executiveBriefing
  const domainTags = resolveDomainTags(briefing)
  const suitability = resolveSuitabilityCriteria(briefing)

  const submissionDeadline =
    briefing?.submissionDeadline ??
    timelineDateByPattern(analysis.timelineItems ?? [], [
      /angebot/i,
      /abgabe/i,
      /deadline/i,
      /einreich/i,
    ])

  const desiredServiceStart =
    briefing?.desiredServiceStart ??
    timelineDateByPattern(analysis.timelineItems ?? [], [
      /servicebeginn/i,
      /projektstart/i,
      /vertragsstart/i,
      /start/i,
    ])

  const strategicAssessment =
    briefing?.strategicAssessment?.trim() || analysis.icpSummary?.trim() || '—'

  const capabilityBullets: string[] = []
  if (hasSuitabilityContent(suitability)) {
    for (const item of suitability.bidderRequirements.slice(0, 4)) {
      capabilityBullets.push(item)
    }
    for (const item of suitability.roleQualifications.slice(0, 3)) {
      capabilityBullets.push(item)
    }
  }
  if (capabilityBullets.length === 0) {
    capabilityBullets.push('Keine expliziten Capability-Anforderungen extrahiert.')
  }

  const deadlines = [...(analysis.timelineItems ?? [])]
    .filter((t) => t.dueDate?.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const deadlineBullets =
    deadlines.length > 0
      ? deadlines.slice(0, 4).map((d) => formatDealDeadlineLabel(d))
      : ['Keine extrahierten Deadlines.']

  const smeTasks = analysis.smeTasks ?? []
  const smeBullets =
    smeTasks.length > 0
      ? smeTasks.slice(0, 3).map((t) => `${t.category}: ${t.question.slice(0, 90)}`)
      : ['Keine offenen SME-Punkte.']

  const capabilityFromBriefing = briefing?.capabilityRisks ?? []
  const contractFlags = redFlags.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  )

  const riskBullets: string[] = []
  for (const r of capabilityFromBriefing) {
    if (r.kind !== 'critical' && r.kind !== 'high') continue
    riskBullets.push(`[${r.kind.toUpperCase()}] ${r.title}`)
    if (riskBullets.length >= 5) break
  }
  for (const f of contractFlags) {
    if (riskBullets.length >= 5) break
    if (capabilityFromBriefing.some((r) => r.title === f.title)) continue
    riskBullets.push(`[${f.severity.toUpperCase()}] ${f.title}`)
  }
  if (riskBullets.length === 0) {
    riskBullets.push('Keine kritischen Risiken extrahiert.')
  }

  const winProbability = analysis.winProbability ?? 0
  const recommendation = winProbabilityRecommendationLabel(
    winProbabilityTone(winProbability),
  )

  const classification =
    domainTags.length > 0
      ? domainTags.join(' · ')
      : analysis.icpFitLabel?.trim() || buildHeroKeyTakeaways(analysis)[0]?.text || '—'

  return {
    customerName: analysis.customerName?.trim() || params.projectName,
    classification,
    recommendation,
    winProbability,
    strategicAssessment,
    techFocus: dash(briefing?.techFocus),
    governance: dash(briefing?.governance),
    volume: dash(briefing?.expectedDealVolume),
    runtime: dash(desiredServiceStart),
    bidInvestment: dash(briefing?.bidInvestment),
    submissionDeadline: dash(submissionDeadline),
    capabilityBullets,
    deadlineBullets,
    smeBullets,
    riskBullets,
  }
}
