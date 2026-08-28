import { describe, expect, it } from 'vitest'

import { documentBelongsToDealForAnalyze } from '@/lib/deals/document-belongs-to-deal-for-analyze'

describe('documentBelongsToDealForAnalyze', () => {
  it('accepts a document owned by the lot', () => {
    expect(
      documentBelongsToDealForAnalyze({
        dealId: 'deal-1',
        dealTenderId: 'tender-1',
        document: { deal_id: 'deal-1', tender_id: null },
      }),
    ).toBe(true)
  })

  it('accepts a tender document of the lot’s Ausschreibung', () => {
    expect(
      documentBelongsToDealForAnalyze({
        dealId: 'deal-1',
        dealTenderId: 'tender-1',
        document: { deal_id: null, tender_id: 'tender-1' },
      }),
    ).toBe(true)
  })

  it('rejects a document from another Ausschreibung', () => {
    expect(
      documentBelongsToDealForAnalyze({
        dealId: 'deal-1',
        dealTenderId: 'tender-1',
        document: { deal_id: null, tender_id: 'tender-other' },
      }),
    ).toBe(false)
  })

  it('rejects a tender document when the lot has no Ausschreibung', () => {
    expect(
      documentBelongsToDealForAnalyze({
        dealId: 'deal-1',
        dealTenderId: null,
        document: { deal_id: null, tender_id: 'tender-1' },
      }),
    ).toBe(false)
  })
})
