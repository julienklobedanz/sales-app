import { describe, expect, it } from 'vitest'

import {
  buildAccountProofMemory,
  impactSortScore,
} from '@/lib/accounts/account-proof-memory-pure'

describe('buildAccountProofMemory', () => {
  const visible = new Set(['ref-1', 'ref-2'])
  const titles = new Map([
    ['ref-1', 'Cloud Migration'],
    ['ref-2', 'Security Case'],
  ])
  const dealTitles = new Map([
    ['deal-a', 'PharmaX'],
    ['deal-b', 'Beta AG'],
  ])

  it('liefert leere Struktur ohne Deals', () => {
    expect(
      buildAccountProofMemory({
        deals: [],
        dealReferences: [],
        events: [],
        visibleRefIds: visible,
        refTitleById: titles,
        dealTitleById: dealTitles,
      })
    ).toEqual({ impact: [], history: [], lastWonWithProof: null })
  })

  it('aggregiert Deals, Siege, Views und entscheidende Referenz', () => {
    const result = buildAccountProofMemory({
      deals: [
        {
          id: 'deal-a',
          title: 'PharmaX',
          status: 'won',
          decisive_reference_id: 'ref-1',
          updated_at: '2026-05-12T10:00:00Z',
        },
        {
          id: 'deal-b',
          title: 'Beta AG',
          status: 'lost',
          decisive_reference_id: null,
          updated_at: '2026-04-02T10:00:00Z',
        },
      ],
      dealReferences: [
        { deal_id: 'deal-a', reference_id: 'ref-1' },
        { deal_id: 'deal-b', reference_id: 'ref-1' },
        { deal_id: 'deal-b', reference_id: 'ref-2' },
      ],
      events: [
        {
          id: 'ev-1',
          created_at: '2026-05-10T08:00:00Z',
          event_type: 'share_link_viewed',
          deal_id: 'deal-a',
          reference_id: 'ref-1',
          payload: {},
        },
        {
          id: 'ev-2',
          created_at: '2026-05-11T08:00:00Z',
          event_type: 'share_link_viewed',
          deal_id: 'deal-a',
          reference_id: 'ref-1',
          payload: {},
        },
        {
          id: 'ev-3',
          created_at: '2026-05-12T09:00:00Z',
          event_type: 'deal_won',
          deal_id: 'deal-a',
          reference_id: 'ref-1',
          payload: { decisive_reference_id: 'ref-1', outcome_reason: 'ISO-Nachweis' },
        },
      ],
      visibleRefIds: visible,
      refTitleById: titles,
      dealTitleById: dealTitles,
    })

    expect(result.impact[0]).toMatchObject({
      referenceId: 'ref-1',
      dealCount: 2,
      wonDealCount: 1,
      viewCount: 2,
      decisiveCount: 1,
    })
    expect(result.history[0]?.label).toContain('gewonnen')
    expect(result.lastWonWithProof).toMatchObject({
      dealTitle: 'PharmaX',
      referenceTitle: 'Cloud Migration',
    })
  })

  it('blendet nicht sichtbare Referenzen aus', () => {
    const result = buildAccountProofMemory({
      deals: [
        {
          id: 'deal-a',
          title: 'PharmaX',
          status: 'won',
          decisive_reference_id: 'ref-hidden',
          updated_at: '2026-05-12T10:00:00Z',
        },
      ],
      dealReferences: [{ deal_id: 'deal-a', reference_id: 'ref-hidden' }],
      events: [],
      visibleRefIds: new Set(['ref-1']),
      refTitleById: titles,
      dealTitleById: dealTitles,
    })

    expect(result.impact).toHaveLength(0)
    expect(result.lastWonWithProof).toBeNull()
  })
})

describe('impactSortScore', () => {
  it('priorisiert entscheidende Referenzen', () => {
    const high = impactSortScore({
      referenceId: 'a',
      title: 'A',
      dealCount: 1,
      wonDealCount: 0,
      viewCount: 0,
      decisiveCount: 1,
    })
    const low = impactSortScore({
      referenceId: 'b',
      title: 'B',
      dealCount: 5,
      wonDealCount: 2,
      viewCount: 10,
      decisiveCount: 0,
    })
    expect(high).toBeGreaterThan(low)
  })
})
