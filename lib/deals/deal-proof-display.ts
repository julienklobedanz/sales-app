import {
  getMatchStrength,
  type MatchStrengthDisplay,
} from '@/lib/match/match-strength'

export type DealProofDisplay =
  | { kind: 'empty' }
  | { kind: 'count_only'; count: number }
  | { kind: 'count_and_score'; count: number; percent: number; strength: MatchStrengthDisplay }

export function proofDisplayFromCounts(
  count: number,
  bestScore: number | null,
): DealProofDisplay {
  if (count === 0) return { kind: 'empty' }
  if (bestScore == null || Number.isNaN(bestScore)) return { kind: 'count_only', count }
  return {
    kind: 'count_and_score',
    count,
    percent: Math.round(bestScore * 100),
    strength: getMatchStrength(bestScore),
  }
}

export function dealProofDisplay(row: {
  linked_refs?: unknown[] | null
  best_match_score: number | null
}): DealProofDisplay {
  return proofDisplayFromCounts(row.linked_refs?.length ?? 0, row.best_match_score)
}
