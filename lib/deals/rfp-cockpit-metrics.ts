import type { WinProbabilityBreakdown } from '@/lib/deal-desk/compute-delivery-win-probability'
import {
  winProbabilityTone,
  type WinProbabilityTone,
} from '@/lib/deal-desk/win-probability'
import { MATCH_COVERAGE_THRESHOLD } from '@/lib/match/match-thresholds'
import { computeCoveragePercentWithVerdicts } from '@/lib/deals/rfp-relevance-coverage'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import type { RfpVerdict } from '@/lib/rfp-relevance'

export const RFP_COCKPIT_ENGINE_VERSION_CURRENT = 2

export type RfpSnapshotMeta = {
  analyzedAt?: string | null
  engineVersion?: number | null
}

export function isRfpMetricsStale(meta: RfpSnapshotMeta): boolean {
  const version = meta.engineVersion ?? 1
  if (version < RFP_COCKPIT_ENGINE_VERSION_CURRENT) return true
  if (!meta.analyzedAt?.trim()) return true
  return false
}

export function computeRequirementCoveragePercent(
  requirements: ExtractedRfpRequirement[],
  coverage: RfpCoverageRow[],
  threshold = MATCH_COVERAGE_THRESHOLD,
  verdicts?: Record<string, RfpVerdict> | null,
): number {
  if (verdicts && Object.keys(verdicts).length > 0) {
    return computeCoveragePercentWithVerdicts(requirements, coverage, verdicts, threshold)
  }
  if (!requirements.length) return 0
  let covered = 0
  for (const req of requirements) {
    const row = coverage.find((c) => c.requirementId === req.id)
    const best = row?.matches?.[0]?.similarity ?? 0
    if (best >= threshold) covered += 1
  }
  return Math.round((covered / requirements.length) * 100)
}

export function resolveBidRecommendation(args: {
  winProbability: number
  hasAnalysis: boolean
  isStale: boolean
}): {
  tone: WinProbabilityTone | 'unknown'
  label: string
  detail: string
} {
  if (!args.hasAnalysis || args.isStale) {
    return {
      tone: 'unknown',
      label: 'Noch nicht berechenbar',
      detail: args.hasAnalysis
        ? 'Analyse basiert auf einer älteren Engine — bitte neu analysieren, bevor du dich auf BID/NO-BID verlässt.'
        : 'Lade ein RFP-Dokument und starte die Analyse, um eine belastbare Empfehlung zu erhalten.',
    }
  }

  const tone = winProbabilityTone(args.winProbability)
  const label =
    tone === 'go'
      ? 'Empfehlung: BID'
      : tone === 'caution'
        ? 'Empfehlung: Prüfen'
        : 'Empfehlung: NO-BID'

  const detail =
    tone === 'go'
      ? 'Starke Angebots-Reife und ausreichende Referenz-Abdeckung — grundsätzlich bieten.'
      : tone === 'caution'
        ? 'Gemischte Signale — Lücken und Risiken vor einer Entscheidung klären.'
        : 'Schwache Ausgangslage — Ressourcen und Alternativen (Partner, No-Bid) prüfen.'

  return { tone, label, detail }
}

export function formatAngebotsReifeBreakdown(
  breakdown: WinProbabilityBreakdown | null,
): string {
  if (!breakdown) return '—'
  return `Portfolio ${breakdown.portfolioScore}% · Capabilities ${breakdown.capabilityScore}% · Nachweise ${breakdown.evidenceScore}%`
}
