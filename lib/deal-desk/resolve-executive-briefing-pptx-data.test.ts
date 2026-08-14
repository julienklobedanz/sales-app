import { describe, expect, it } from 'vitest'

import { DEMO_EXECUTIVE_BRIEFING } from '@/lib/deal-desk/deal-analysis-types'
import { resolveExecutiveBriefingPptxData } from '@/lib/deal-desk/resolve-executive-briefing-pptx-data'

describe('resolveExecutiveBriefingPptxData', () => {
  it('maps briefing fields and critical risks for pptx export', () => {
    const data = resolveExecutiveBriefingPptxData({
      projectName: 'Logistik RFP',
      analysis: {
        customerName: 'Logistik AG',
        icpFitLabel: 'Starker ICP-Fit',
        icpSummary: 'Strategischer Fit.',
        executiveBriefing: DEMO_EXECUTIVE_BRIEFING,
        timelineItems: [
          {
            id: 'tl-1',
            title: 'Angebotsabgabe',
            dueDate: '2026-06-19',
            dueTime: '17:00',
          },
        ],
        smeTasks: [
          {
            id: 's-1',
            question: 'Haftung verhandelbar?',
            category: 'Legal',
            dueInDays: 2,
          },
        ],
        redFlags: [],
      } as never,
      redFlags: [
        {
          id: 'rf-1',
          severity: 'critical',
          title: 'Unbegrenzte Haftung',
          excerpt: 'Haftet unbeschränkt.',
        },
      ],
    })

    expect(data.customerName).toBe('Logistik AG')
    expect(data.classification).toContain('Cloud')
    expect(data.volume).toContain('1.200.000')
    expect(data.capabilityBullets.length).toBeGreaterThan(0)
    expect(data.deadlineBullets[0]).toContain('Angebotsabgabe')
    expect(data.smeBullets[0]).toContain('Legal')
    expect(data.riskBullets.some((r) => r.includes('CRITICAL'))).toBe(true)
  })
})
