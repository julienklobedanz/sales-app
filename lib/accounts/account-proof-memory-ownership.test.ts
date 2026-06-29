import { describe, expect, it } from 'vitest'

import { buildAccountProofMemory } from '@/lib/accounts/account-proof-memory-pure'

describe('account proof memory ownership (pure)', () => {
  it('aggregiert unabhängig vom account_manager_id', () => {
    const visible = new Set(['ref-1'])
    const titles = new Map([['ref-1', 'Approved Case']])
    const dealTitles = new Map([['deal-1', 'PharmaX']])

    const withManager = buildAccountProofMemory({
      deals: [
        {
          id: 'deal-1',
          title: 'PharmaX',
          status: 'won',
          decisive_reference_id: 'ref-1',
          updated_at: '2026-06-01T12:00:00Z',
          account_manager_id: 'rep-a',
        },
      ],
      dealReferences: [{ deal_id: 'deal-1', reference_id: 'ref-1' }],
      events: [],
      visibleRefIds: visible,
      refTitleById: titles,
      dealTitleById: dealTitles,
    })

    const withoutManager = buildAccountProofMemory({
      deals: [
        {
          id: 'deal-1',
          title: 'PharmaX',
          status: 'won',
          decisive_reference_id: 'ref-1',
          updated_at: '2026-06-01T12:00:00Z',
          account_manager_id: null,
        },
      ],
      dealReferences: [{ deal_id: 'deal-1', reference_id: 'ref-1' }],
      events: [],
      visibleRefIds: visible,
      refTitleById: titles,
      dealTitleById: dealTitles,
    })

    expect(withoutManager).toEqual(withManager)
    expect(withoutManager.impact[0]?.decisiveCount).toBe(1)
  })
})
