import { describe, expect, it } from 'vitest'

import {
  extractCoveredReferenceIds,
  extractCoveredReferences,
} from '@/components/deals/deal-coverage-matrix'
import type { RfpCoverageRow } from '@/lib/rfp-coverage-types'

function row(
  requirementId: string,
  match: { id: string; title: string; similarity: number; companyName?: string | null } | null,
  embedError?: string
): RfpCoverageRow {
  return {
    requirementId,
    requirementText: requirementId,
    matches: match
      ? [
          {
            id: match.id,
            title: match.title,
            summary: null,
            industry: null,
            similarity: match.similarity,
            companyName: match.companyName ?? null,
          },
        ]
      : [],
    embedError,
  }
}

describe('deal-coverage-matrix covered references', () => {
  it('extracts only references above threshold without duplicates', () => {
    const coverage = [
      row('a', { id: 'ref-1', title: 'Alpha', similarity: 0.8 }),
      row('b', { id: 'ref-1', title: 'Alpha', similarity: 0.9 }),
      row('c', { id: 'ref-2', title: 'Beta', similarity: 0.4 }),
      row('d', null),
    ]

    expect(extractCoveredReferenceIds(coverage)).toEqual(['ref-1'])
    expect(extractCoveredReferences(coverage)).toEqual([
      { id: 'ref-1', title: 'Alpha', companyName: null },
    ])
  })

  it('ignores rows with embed errors', () => {
    const coverage = [row('a', { id: 'ref-1', title: 'Alpha', similarity: 0.9 }, 'fail')]
    expect(extractCoveredReferenceIds(coverage)).toEqual([])
  })
})
