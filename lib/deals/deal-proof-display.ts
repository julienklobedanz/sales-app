import {
  getMatchStrength,
  type MatchStrengthDisplay,
} from '@/lib/match/match-strength'

export type DealProofDisplay =
  | { kind: 'empty' }
  | { kind: 'count_only'; count: number }
  | { kind: 'count_and_score'; count: number; percent: number; strength: MatchStrengthDisplay }

export function dealProofDisplay(row: {
  linked_refs?: unknown[] | null
  best_match_score: number | null
}): DealProofDisplay {
  const count = row.linked_refs?.length ?? 0
  if (count === 0) return { kind: 'empty' }
  const score = row.best_match_score
  if (score == null || Number.isNaN(score)) return { kind: 'count_only', count }
  return {
    kind: 'count_and_score',
    count,
    percent: Math.round(score * 100),
    strength: getMatchStrength(score),
  }
}
