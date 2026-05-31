/** Win-Probability-Ring: Farben und Go/No-Go-Empfehlung. */

import type { WinProbabilityBreakdown } from '@/lib/deal-desk/compute-delivery-win-probability'

export const WIN_PROBABILITY_THRESHOLDS = {
  /** Ab diesem Wert: Grün — klare GO-Empfehlung */
  goMin: 70,
  /** Ab diesem Wert (unter goMin): Gelb/Amber — prüfen, Risiken abwägen */
  cautionMin: 40,
} as const

export type WinProbabilityTone = 'go' | 'caution' | 'no-bid'

export function winProbabilityTone(value: number): WinProbabilityTone {
  const pct = Math.min(100, Math.max(0, value))
  if (pct >= WIN_PROBABILITY_THRESHOLDS.goMin) return 'go'
  if (pct >= WIN_PROBABILITY_THRESHOLDS.cautionMin) return 'caution'
  return 'no-bid'
}

export function winProbabilityRecommendationLabel(tone: WinProbabilityTone): string {
  if (tone === 'go') return 'Empfehlung: GO'
  if (tone === 'caution') return 'Empfehlung: Prüfen'
  return 'Empfehlung: NO-BID'
}

export function winProbabilityScoreLegend(): string {
  const { goMin, cautionMin } = WIN_PROBABILITY_THRESHOLDS
  return `Lieferfähigkeit: Portfolio 40% · Capabilities 35% · Nachweise 25% · Vertragsrisiko als Abzug. ≥${goMin}% GO · ${cautionMin}–${goMin - 1}% prüfen · <${cautionMin}% NO-BID`
}

export function winProbabilityBreakdownTooltip(breakdown: WinProbabilityBreakdown): string {
  const lines = [
    `Portfolio (Referenzen): ${breakdown.portfolioScore}%`,
    `Capabilities (Match-Tiefe): ${breakdown.capabilityScore}%`,
    `Nachweise (Compliance): ${breakdown.evidenceScore}%`,
    breakdown.contractPenalty > 0 ? `Vertragsrisiko: −${breakdown.contractPenalty} Punkte` : null,
    `Gewichtet: ${breakdown.weightedScore}% → ${breakdown.finalScore}%`,
  ].filter(Boolean)
  return lines.join('\n')
}

export function winProbabilityRingClass(tone: WinProbabilityTone): string {
  if (tone === 'go') return 'text-emerald-600 dark:text-emerald-400'
  if (tone === 'caution') return 'text-amber-500 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function winProbabilityValueClass(tone: WinProbabilityTone): string {
  if (tone === 'go') return 'text-emerald-700 dark:text-emerald-300'
  if (tone === 'caution') return 'text-amber-700 dark:text-amber-300'
  return 'text-red-700 dark:text-red-300'
}
