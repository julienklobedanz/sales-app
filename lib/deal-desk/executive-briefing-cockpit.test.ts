import { describe, expect, it } from 'vitest'

import { buildExecutiveBriefingText } from '@/lib/deal-desk/executive-briefing'
import { buildEmptyDealDeskAnalysis } from '@/lib/deal-desk/deal-analysis-types'

describe('executive briefing cockpit (Phase 7)', () => {
  it('buildExecutiveBriefingText produces non-empty briefing for minimal analysis', () => {
    const analysis = buildEmptyDealDeskAnalysis(['RFP.pdf'])
    const text = buildExecutiveBriefingText({
      projectName: 'Test-RFP',
      analysis: {
        ...analysis,
        customerName: 'Muster AG',
        winProbability: 62,
        icpFitLabel: 'Gut',
      },
    })
    expect(text).toContain('EXECUTIVE BRIEFING')
    expect(text).toContain('Muster AG')
    expect(text).toContain('62%')
  })
})
