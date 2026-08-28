import { describe, expect, it } from 'vitest'

import {
  isTenderOwnedDocument,
  mergeLotAndTenderDocuments,
} from '@/lib/deals/document-display'

describe('isTenderOwnedDocument', () => {
  it('treats tender_id without deal_id as inherited', () => {
    expect(isTenderOwnedDocument({ deal_id: null, tender_id: 'tender-1' })).toBe(true)
    expect(isTenderOwnedDocument({ deal_id: 'deal-1', tender_id: null })).toBe(false)
  })
})

describe('mergeLotAndTenderDocuments', () => {
  it('merges lot and tender rows newest first', () => {
    const merged = mergeLotAndTenderDocuments(
      [{ deal_id: 'deal-1', tender_id: null, created_at: '2026-01-01T00:00:00.000Z' }],
      [
        {
          deal_id: null,
          tender_id: 'tender-1',
          created_at: '2026-02-01T00:00:00.000Z',
        },
      ],
    )
    expect(merged.map((row) => row.tender_id ?? row.deal_id)).toEqual([
      'tender-1',
      'deal-1',
    ])
  })
})
