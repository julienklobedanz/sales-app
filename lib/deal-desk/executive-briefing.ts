import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import type { DealDeskCapabilityRisk } from '@/lib/deal-desk/executive-briefing-fields'
import {
  hasSuitabilityContent,
  resolveDomainTags,
  resolveProjectLocation,
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

function bulletLine(label: string, value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  return `• ${label}: ${v}`
}

function riskKindLabel(
  kind: DealDeskCapabilityRisk['kind'] | DealDeskRedFlag['severity'],
): string {
  if (kind === 'delivery') return 'DELIVERY RISK'
  return kind.toUpperCase()
}

export function buildExecutiveBriefingText(params: {
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags?: DealDeskRedFlag[]
}): string {
  const { projectName, analysis, redFlags = analysis.redFlags ?? [] } = params
  const briefing = analysis.executiveBriefing
  const winPct = analysis.winProbability ?? 0
  const tone = winProbabilityTone(winPct)
  const recommendation = winProbabilityRecommendationLabel(tone)

  const submissionDeadline =
    briefing?.submissionDeadline ??
    timelineDateByPattern(analysis.timelineItems, [
      /angebot/i,
      /abgabe/i,
      /deadline/i,
      /einreich/i,
    ])

  const desiredServiceStart =
    briefing?.desiredServiceStart ??
    timelineDateByPattern(analysis.timelineItems, [
      /servicebeginn/i,
      /projektstart/i,
      /vertragsstart/i,
      /start/i,
    ])

  const strategicAssessment =
    briefing?.strategicAssessment?.trim() || analysis.icpSummary?.trim() || '—'

  const takeaways = briefing?.keyTakeaways?.length
    ? briefing.keyTakeaways
    : buildHeroKeyTakeaways(analysis).map((t) => t.text)

  const deadlines = [...(analysis.timelineItems ?? [])]
    .filter((t) => t.dueDate?.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const capabilityFromBriefing = briefing?.capabilityRisks ?? []
  const contractFlags = redFlags.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  )

  const domainTags = resolveDomainTags(briefing)
  const projectLocation = resolveProjectLocation(briefing)
  const suitability = resolveSuitabilityCriteria(briefing)

  const lines: string[] = [
    `EXECUTIVE BRIEFING — ${projectName}`,
    `Kunde: ${analysis.customerName}`,
  ]

  if (domainTags.length) {
    lines.push(`Klassifizierung: ${domainTags.join(' · ')}`)
  }
  if (projectLocation !== '—') {
    lines.push(`Standort: ${projectLocation}`)
  }

  if (submissionDeadline) lines.push(`Abgabedatum (Deadline): ${submissionDeadline}`)
  if (desiredServiceStart) lines.push(`Gewünschter Servicebeginn: ${desiredServiceStart}`)

  const decisionReasons = takeaways.slice(0, 3).filter(Boolean)

  const commercialLines = [
    bulletLine('Erwartetes Deal-Volumen', briefing?.expectedDealVolume),
    bulletLine('Bid-Investment', briefing?.bidInvestment),
  ].filter((l): l is string => Boolean(l))

  const scopeLines = [
    bulletLine('Tech-Fokus', briefing?.techFocus),
    bulletLine('Governance', briefing?.governance),
  ].filter((l): l is string => Boolean(l))

  const buyingLines = [
    bulletLine('Wirtschaftlicher Entscheider', briefing?.economicDecisionMaker),
    bulletLine('Wettbewerb', briefing?.competition),
    bulletLine('Unser Hebel', briefing?.ourLeverage),
    bulletLine('Tender-Verfahren', briefing?.tenderProcedure),
  ].filter((l): l is string => Boolean(l))

  type RiskItem = {
    rank: number
    label: string
    title: string
    detail?: string
  }

  const severityRank = (
    k: DealDeskCapabilityRisk['kind'] | DealDeskRedFlag['severity'],
  ): number => {
    if (k === 'critical') return 0
    if (k === 'high') return 1
    return 2
  }

  const riskByTitle = new Map<string, RiskItem>()
  for (const r of capabilityFromBriefing) {
    riskByTitle.set(r.title, {
      rank: severityRank(r.kind),
      label: riskKindLabel(r.kind),
      title: r.title,
      detail: r.detail,
    })
  }
  for (const f of contractFlags) {
    if (riskByTitle.has(f.title)) continue
    riskByTitle.set(f.title, {
      rank: severityRank(f.severity),
      label: riskKindLabel(f.severity),
      title: f.title,
      detail: f.excerpt,
    })
  }

  const topRiskItems = [...riskByTitle.values()]
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 6)

  // 1) Entscheidung (kurz)
  lines.push('', '— ENTSCHEIDUNG —')
  lines.push(recommendation)
  lines.push(`Win-Probability: ${winPct}%`)
  lines.push(`ICP-Fit: ${analysis.icpFitLabel}`)
  if (decisionReasons.length) {
    lines.push('', 'Gründe (kurz):')
    lines.push(...decisionReasons.map((t) => `• ${t}`))
  }

  // 2) Deal-Fakten & Commercials
  lines.push('', '— DEAL-FAKTEN & COMMERCIALS —')
  if (commercialLines.length) {
    lines.push(...commercialLines)
  } else {
    lines.push('• Erwartetes Deal-Volumen: — (nicht im Dokument extrahiert)')
    lines.push('• Bid-Investment: — (nicht im Dokument extrahiert)')
  }
  if (scopeLines.length) lines.push(...scopeLines)
  else lines.push('• Tech-Fokus: —', '• Governance: —')

  // 3) Fit & Gap (ohne tiefe Qualification)
  lines.push('', '— FIT & GAP —')
  lines.push(strategicAssessment)
  if (hasSuitabilityContent(suitability)) {
    const koCandidates = [
      ...suitability.bidderRequirements,
      ...suitability.roleQualifications,
      ...suitability.specialConditions,
    ]
    const shown = koCandidates.slice(0, 6)
    if (shown.length) {
      lines.push('', 'K.O.- / Eignungsrahmen (kompakt):')
      lines.push(...shown.map((t) => `• ${t}`))
      const remaining = koCandidates.length - shown.length
      if (remaining > 0) {
        lines.push(`• +${remaining} weitere Details (siehe Deal Desk)`)
      }
    }
  }

  // 4) Buying Center & Wettbewerb (kurz, vor Risiken)
  lines.push('', '— BUYING CENTER & VERFAHREN —')
  if (buyingLines.length) lines.push(...buyingLines)
  else {
    lines.push(
      '• Wirtschaftlicher Entscheider: —',
      '• Wettbewerb: —',
      '• Unser Hebel: —',
      '• Tender-Verfahren: —',
    )
  }

  // 5) Top-Risiken
  lines.push('', '— TOP-RISIKEN —')
  if (topRiskItems.length === 0) {
    lines.push('• Keine kritischen Risiken extrahiert.')
  } else {
    for (const r of topRiskItems) {
      lines.push(`• [${r.label}] ${r.title}`)
      if (r.detail) lines.push(`  ${r.detail.replace(/\s+/g, ' ').slice(0, 280)}`)
    }
  }

  // 6) Fristen (alle)
  lines.push('', '— FRISTEN —')
  if (deadlines.length === 0) {
    lines.push('• Keine extrahierten Deadlines.')
  } else {
    for (const d of deadlines) lines.push(`• ${formatDealDeadlineLabel(d)}`)
  }

  const openSme = (analysis.smeTasks ?? []).length
  if (openSme > 0) {
    lines.push(
      '',
      '— OFFENE SME-PUNKTE —',
      `• ${openSme} Klärungspunkt(e) — siehe Deal Desk Tab SME Routing.`,
    )
  }

  lines.push(
    '',
    '— HINWEIS —',
    'Internes Freigabe-Dokument (E-Mail / Management). Keine Kundendaten an Dritte weitergeben.',
  )

  return lines.join('\n')
}
