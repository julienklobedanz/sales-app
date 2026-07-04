import { MATCH_COVERAGE_THRESHOLD } from '@/lib/match/match-thresholds'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import type { RfpVerdict } from '@/lib/rfp-relevance'

export function isRequirementCovered(
  row: RfpCoverageRow,
  verdicts?: Record<string, RfpVerdict> | null,
  threshold = MATCH_COVERAGE_THRESHOLD
): boolean {
  const verdict = verdicts?.[row.requirementId]
  if (verdict) {
    return verdict.verdict === 'covers' || verdict.verdict === 'partial'
  }
  const best = row.matches[0]
  return Boolean(best && !row.embedError && best.similarity >= threshold)
}

export function effectiveSimilarity(
  row: RfpCoverageRow,
  verdicts?: Record<string, RfpVerdict> | null
): number {
  const best = row.matches[0]
  const raw = best && !row.embedError ? Math.min(1, Math.max(0, best.similarity)) : 0
  const verdict = verdicts?.[row.requirementId]
  if (!verdict) return raw
  if (verdict.verdict === 'none') return 0
  if (verdict.verdict === 'partial') return Math.min(raw, MATCH_COVERAGE_THRESHOLD)
  return raw
}

export function resolveCoverageMatch(
  row: RfpCoverageRow,
  verdicts?: Record<string, RfpVerdict> | null
): RfpCoverageRow['matches'][number] | undefined {
  const verdict = verdicts?.[row.requirementId]
  if (verdict?.chosenId) {
    return row.matches.find((m) => m.id === verdict.chosenId) ?? row.matches[0]
  }
  return row.matches[0]
}

export function computeCoveragePercentWithVerdicts(
  requirements: ExtractedRfpRequirement[],
  coverage: RfpCoverageRow[],
  verdicts?: Record<string, RfpVerdict> | null,
  threshold = MATCH_COVERAGE_THRESHOLD
): number {
  if (!requirements.length) return 0
  let covered = 0
  for (const req of requirements) {
    const row = coverage.find((c) => c.requirementId === req.id)
    if (!row) continue
    if (isRequirementCovered(row, verdicts, threshold)) covered += 1
  }
  return Math.round((covered / requirements.length) * 100)
}
