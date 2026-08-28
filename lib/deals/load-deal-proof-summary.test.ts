import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

import { loadDealProofSummary } from './load-deal-proof-summary'

function mockClient(
  rows: Array<{ deal_id: string; similarity_score: number | null }>,
): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      expect(table).toBe('deal_references')
      return {
        select: (cols: string) => {
          expect(cols).toBe('deal_id, similarity_score')
          return {
            in: async (col: string, ids: string[]) => {
              expect(col).toBe('deal_id')
              return {
                data: rows.filter((row) => ids.includes(row.deal_id)),
              }
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient<Database>
}

describe('loadDealProofSummary', () => {
  it('gibt ein leeres Objekt ohne Query zurück', async () => {
    const from = vi.fn()
    const summary = await loadDealProofSummary(
      { from } as unknown as SupabaseClient<Database>,
      [],
    )
    expect(summary).toEqual({})
    expect(from).not.toHaveBeenCalled()
  })

  it('zählt Referenzen und nimmt den höchsten Score', async () => {
    const summary = await loadDealProofSummary(
      mockClient([
        { deal_id: 'a', similarity_score: 0.4 },
        { deal_id: 'a', similarity_score: 0.82 },
        { deal_id: 'b', similarity_score: null },
      ]),
      ['a', 'b', 'c'],
    )
    expect(summary).toEqual({
      a: { count: 2, bestScore: 0.82 },
      b: { count: 1, bestScore: null },
      c: { count: 0, bestScore: null },
    })
  })
})
