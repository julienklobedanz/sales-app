import { describe, expect, it } from 'vitest'

import { buildComplianceDocumentDealUsage } from './build-compliance-document-deal-usage'

describe('buildComplianceDocumentDealUsage', () => {
  it('zählt Deals distinct und gruppiert Anforderungen', () => {
    const usage = buildComplianceDocumentDealUsage([
      {
        documentId: 'doc-1',
        dealId: 'deal-b',
        dealTitle: 'Zebra',
        requirementId: 'r2',
        requirementText: 'Zweite',
      },
      {
        documentId: 'doc-1',
        dealId: 'deal-a',
        dealTitle: 'Alpha',
        requirementId: 'r1',
        requirementText: 'Erste',
      },
      {
        documentId: 'doc-1',
        dealId: 'deal-a',
        dealTitle: 'Alpha',
        requirementId: 'r1b',
        requirementText: 'Andere',
      },
      {
        documentId: 'doc-2',
        dealId: 'deal-a',
        dealTitle: 'Alpha',
        requirementId: 'r3',
        requirementText: 'ISO',
      },
    ])

    expect(usage['doc-1']?.dealCount).toBe(2)
    expect(usage['doc-1']?.deals.map((d) => d.dealId)).toEqual(['deal-a', 'deal-b'])
    expect(usage['doc-1']?.deals[0]?.requirements.map((r) => r.id)).toEqual(['r1b', 'r1'])
    expect(usage['doc-2']?.dealCount).toBe(1)
  })
})
