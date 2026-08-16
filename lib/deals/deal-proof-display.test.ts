import { describe, expect, it } from 'vitest'

import { dealProofDisplay } from './deal-proof-display'

describe('dealProofDisplay', () => {
  it('zeigt Gedankenstrich ohne Referenzen', () => {
    expect(dealProofDisplay({ linked_refs: [], best_match_score: 0.9 })).toEqual({
      kind: 'empty',
    })
  })

  it('zeigt nur den Zähler ohne Score', () => {
    expect(
      dealProofDisplay({
        linked_refs: [{ id: 'a' }, { id: 'b' }],
        best_match_score: null,
      }),
    ).toEqual({ kind: 'count_only', count: 2 })
  })

  it('zeigt Zähler und Kreis bei Score', () => {
    const result = dealProofDisplay({
      linked_refs: [{ id: 'a' }],
      best_match_score: 0.82,
    })
    expect(result.kind).toBe('count_and_score')
    if (result.kind === 'count_and_score') {
      expect(result.count).toBe(1)
      expect(result.percent).toBe(82)
    }
  })
})
