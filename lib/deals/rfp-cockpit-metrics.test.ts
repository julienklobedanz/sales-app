import { describe, expect, it } from 'vitest'

import {
  computeRequirementCoveragePercent,
  isRfpMetricsStale,
  resolveBidRecommendation,
} from '@/lib/deals/rfp-cockpit-metrics'

describe('rfp-cockpit-metrics', () => {
  it('marks legacy snapshots without engineVersion as stale', () => {
    expect(isRfpMetricsStale({ analyzedAt: '2026-01-01T00:00:00Z' })).toBe(true)
    expect(
      isRfpMetricsStale({ analyzedAt: '2026-01-01T00:00:00Z', engineVersion: 2 }),
    ).toBe(false)
  })

  it('computes coverage percent from requirement matches', () => {
    const pct = computeRequirementCoveragePercent(
      [
        { id: 'r1', text: 'A', category: 'x' },
        { id: 'r2', text: 'B', category: 'x' },
      ],
      [
        {
          requirementId: 'r1',
          requirementText: 'A',
          matches: [
            {
              id: '1',
              title: 'T',
              summary: null,
              industry: null,
              similarity: 0.4,
              companyName: 'C',
            },
          ],
        },
        {
          requirementId: 'r2',
          requirementText: 'B',
          matches: [
            {
              id: '2',
              title: 'T2',
              summary: null,
              industry: null,
              similarity: 0.2,
              companyName: 'C',
            },
          ],
        },
      ],
      0.35,
    )
    expect(pct).toBe(50)
  })

  it('degrades recommendation when stale', () => {
    const rec = resolveBidRecommendation({
      winProbability: 90,
      hasAnalysis: true,
      isStale: true,
    })
    expect(rec.tone).toBe('unknown')
    expect(rec.label).toContain('Noch nicht berechenbar')
  })

  it('returns BID for high win probability when fresh', () => {
    const rec = resolveBidRecommendation({
      winProbability: 80,
      hasAnalysis: true,
      isStale: false,
    })
    expect(rec.label).toBe('Empfehlung: BID')
  })
})
