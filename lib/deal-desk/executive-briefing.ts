import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { buildHeroKeyTakeaways } from '@/lib/deal-desk/hero-key-takeaways'
import {
  winProbabilityRecommendationLabel,
  winProbabilityTone,
} from '@/lib/deal-desk/win-probability'

function formatDateDe(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function buildExecutiveBriefingText(params: {
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags?: DealDeskRedFlag[]
}): string {
  const { projectName, analysis, redFlags = analysis.redFlags ?? [] } = params
  const winPct = analysis.winProbability ?? 0
  const tone = winProbabilityTone(winPct)
  const recommendation = winProbabilityRecommendationLabel(tone)
  const takeaways = buildHeroKeyTakeaways(analysis)

  const deadlines = [...(analysis.timelineItems ?? [])]
    .filter((t) => t.dueDate?.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6)

  const criticalFlags = redFlags.filter(
    (f) => f.severity === 'critical' || f.severity === 'high'
  )

  const lines: string[] = [
    `EXECUTIVE BRIEFING — ${projectName}`,
    `Kunde: ${analysis.customerName}`,
    `Datum: ${formatDateDe(new Date().toISOString().slice(0, 10))}`,
    '',
    '— ENTSCHEIDUNG —',
    `Win-Probability: ${winPct}% (${recommendation})`,
    `ICP-Fit: ${analysis.icpFitLabel}`,
    '',
    '— STRATEGISCHE EINSCHÄTZUNG —',
    analysis.icpSummary,
    '',
    '— KEY TAKEAWAYS —',
    ...takeaways.map((t) => `• ${t.text}`),
    '',
    '— KRITISCHE RISIKEN —',
  ]

  if (criticalFlags.length === 0) {
    lines.push('• Keine kritischen/hohen Red Flags markiert.')
  } else {
    for (const f of criticalFlags.slice(0, 8)) {
      lines.push(`• [${f.severity.toUpperCase()}] ${f.title}`)
      if (f.excerpt) lines.push(`  ${f.excerpt.replace(/\s+/g, ' ').slice(0, 200)}`)
    }
  }

  lines.push('', '— NÄCHSTE FRISTEN —')
  if (deadlines.length === 0) {
    lines.push('• Keine extrahierten Deadlines.')
  } else {
    for (const d of deadlines) {
      lines.push(`• ${formatDateDe(d.dueDate)} — ${d.title}`)
    }
  }

  const openSme = (analysis.smeTasks ?? []).length
  if (openSme > 0) {
    lines.push('', '— OFFENE SME-PUNKTE —', `• ${openSme} Klärungspunkt(e) — siehe Deal Desk Tab SME Routing.`)
  }

  lines.push(
    '',
    '— HINWEIS —',
    'Internes Freigabe-Dokument (E-Mail / Management). Keine Kundendaten an Dritte weitergeben.'
  )

  return lines.join('\n')
}
