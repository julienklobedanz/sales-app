import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import type {
  DealDeskCapabilityRisk,
  DealDeskExecutiveBriefingFields,
} from '@/lib/deal-desk/executive-briefing-fields'
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
  patterns: RegExp[]
): string | null {
  const hit = items.find((t) => patterns.some((p) => p.test(t.title)))
  return hit?.dueDate ? formatDateDe(hit.dueDate) : null
}

function bulletLine(label: string, value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  return `• ${label}: ${v}`
}

function riskKindLabel(kind: DealDeskCapabilityRisk['kind'] | DealDeskRedFlag['severity']): string {
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

  const takeaways =
    briefing?.keyTakeaways?.length ? briefing.keyTakeaways : buildHeroKeyTakeaways(analysis).map((t) => t.text)

  const deadlines = [...(analysis.timelineItems ?? [])]
    .filter((t) => t.dueDate?.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const capabilityFromBriefing = briefing?.capabilityRisks ?? []
  const contractFlags = redFlags.filter(
    (f) => f.severity === 'critical' || f.severity === 'high'
  )

  const lines: string[] = [
    `EXECUTIVE BRIEFING — ${projectName}`,
    `Kunde: ${analysis.customerName}`,
  ]

  if (submissionDeadline) lines.push(`Abgabedatum (Deadline): ${submissionDeadline}`)
  if (desiredServiceStart) lines.push(`Gewünschter Servicebeginn: ${desiredServiceStart}`)

  lines.push(
    '',
    '— ENTSCHEIDUNG —',
    `Win-Probability: ${winPct}% (Empfehlung: ${recommendation})`,
    `ICP-Fit: ${analysis.icpFitLabel}`,
    '',
    '— COMMERCIALS & BIETER-AUFWAND —'
  )

  const commercialLines = [
    bulletLine('Erwartetes Deal-Volumen', briefing?.expectedDealVolume),
    bulletLine('Bid-Investment', briefing?.bidInvestment),
  ].filter((l): l is string => Boolean(l))

  if (commercialLines.length) {
    lines.push(...commercialLines)
  } else {
    lines.push('• Erwartetes Deal-Volumen: — (nicht im Dokument extrahiert)')
    lines.push('• Bid-Investment: — (nicht im Dokument extrahiert)')
  }

  lines.push('', '— STRATEGISCHE EINSCHÄTZUNG —', strategicAssessment)

  lines.push('', '— SCOPE & COMPLIANCE —')
  const scopeLines = [
    bulletLine('Tech-Fokus', briefing?.techFocus),
    bulletLine('Governance', briefing?.governance),
  ].filter((l): l is string => Boolean(l))
  if (scopeLines.length) lines.push(...scopeLines)
  else lines.push('• Tech-Fokus: —', '• Governance: —')

  lines.push('', '— BUYING CENTER & COMPETITION —')
  const buyingLines = [
    bulletLine('Wirtschaftlicher Entscheider', briefing?.economicDecisionMaker),
    bulletLine('Wettbewerb', briefing?.competition),
    bulletLine('Unser Hebel', briefing?.ourLeverage),
    bulletLine('Tender-Verfahren', briefing?.tenderProcedure),
  ].filter((l): l is string => Boolean(l))
  if (buyingLines.length) lines.push(...buyingLines)
  else {
    lines.push(
      '• Wirtschaftlicher Entscheider: —',
      '• Wettbewerb: —',
      '• Unser Hebel: —',
      '• Tender-Verfahren: —'
    )
  }

  lines.push('', '— KEY TAKEAWAYS —')
  if (takeaways.length) {
    lines.push(...takeaways.map((t) => `• ${t}`))
  } else {
    lines.push('• —')
  }

  lines.push('', '— KRITISCHE RISIKEN & CAPABILITIES —')
  const riskBlocks: string[] = []

  for (const r of capabilityFromBriefing.slice(0, 6)) {
    riskBlocks.push(`• [${riskKindLabel(r.kind)}] ${r.title}`)
    if (r.detail) riskBlocks.push(`  ${r.detail.replace(/\s+/g, ' ').slice(0, 280)}`)
  }

  for (const f of contractFlags.slice(0, 8)) {
    if (capabilityFromBriefing.some((r) => r.title === f.title)) continue
    riskBlocks.push(`• [${riskKindLabel(f.severity)}] ${f.title}`)
    if (f.excerpt) riskBlocks.push(`  ${f.excerpt.replace(/\s+/g, ' ').slice(0, 280)}`)
  }

  if (riskBlocks.length === 0) {
    lines.push('• Keine kritischen Risiken extrahiert.')
  } else {
    lines.push(...riskBlocks)
  }

  lines.push('', '— NÄCHSTE FRISTEN —')
  if (deadlines.length === 0) {
    lines.push('• Keine extrahierten Deadlines.')
  } else {
    for (const d of deadlines) {
      lines.push(`• ${formatDealDeadlineLabel(d)}`)
    }
  }

  const openSme = (analysis.smeTasks ?? []).length
  if (openSme > 0) {
    lines.push(
      '',
      '— OFFENE SME-PUNKTE —',
      `• ${openSme} Klärungspunkt(e) — siehe Deal Desk Tab SME Routing.`
    )
  }

  lines.push(
    '',
    '— HINWEIS —',
    'Internes Freigabe-Dokument (E-Mail / Management). Keine Kundendaten an Dritte weitergeben.'
  )

  return lines.join('\n')
}
