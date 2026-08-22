import type { DealDeskMockAnalysis } from '@/lib/deal-desk/deal-analysis-types'
import { winProbabilityTone } from '@/lib/deal-desk/win-probability'

export type HeroTakeawayIconKind = 'sparkles' | 'alert' | 'partnership'

export type HeroKeyTakeaway = {
  icon: HeroTakeawayIconKind
  text: string
}

export function buildHeroKeyTakeaways(
  analysis: Pick<
    DealDeskMockAnalysis,
    'winProbability' | 'icpFitLabel' | 'draftRows' | 'redFlags'
  >,
): HeroKeyTakeaway[] {
  const matched = (analysis.draftRows ?? []).filter((r) => r.reference).length
  const flags = analysis.redFlags ?? []
  const criticalHigh = flags.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  )
  const slaOrContractRisk = criticalHigh.find((f) =>
    /sla|pönale|haftung|vertrag|festpreis/i.test(`${f.title} ${f.excerpt}`),
  )

  const tone = winProbabilityTone(analysis.winProbability ?? 0)
  const takeaways: HeroKeyTakeaway[] = []

  if (tone === 'go') {
    takeaways.push({
      icon: 'sparkles',
      text: 'Budget & Laufzeit passen zum ICP-Korridor',
    })
  } else if (tone === 'caution') {
    takeaways.push({
      icon: 'sparkles',
      text: `${analysis.icpFitLabel || 'ICP'} — Details und Scope prüfen`,
    })
  } else {
    takeaways.push({
      icon: 'sparkles',
      text: 'Schwacher strategischer Fit — Go-Entscheidung kritisch prüfen',
    })
  }

  if (slaOrContractRisk) {
    takeaways.push({
      icon: 'alert',
      text: `Erhöhtes Risiko: ${slaOrContractRisk.title}`,
    })
  } else if (criticalHigh.length > 0) {
    takeaways.push({
      icon: 'alert',
      text: `${criticalHigh.length} kritische/hohe Vertrags-Flags im Fokus`,
    })
  } else {
    takeaways.push({
      icon: 'alert',
      text: 'Keine kritischen Vertrags-Flags erkannt',
    })
  }

  if (matched > 0) {
    takeaways.push({
      icon: 'partnership',
      text: `Matcht mit ${matched} intern${matched === 1 ? 'er' : 'en'} Referenz${matched === 1 ? '' : 'en'}`,
    })
  } else {
    takeaways.push({
      icon: 'partnership',
      text: 'Noch keine Referenz-Matches — Proof nachziehen',
    })
  }

  return takeaways
}
