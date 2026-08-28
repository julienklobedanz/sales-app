import { describe, expect, it } from 'vitest'

import type { DealStatus } from '@/app/(app)/deals/types'
import { COPY } from '@/lib/copy'

import {
  formatLotPriorityGapHint,
  orderLotsForPriorityList,
  shouldShowLotPriorityGap,
} from './lot-priority-gap'

const lots = [
  { status: 'won' as DealStatus, lot_priority: null },
  { status: 'negotiation' as DealStatus, lot_priority: null },
  { status: 'withdrawn' as DealStatus, lot_priority: null },
]

describe('shouldShowLotPriorityGap', () => {
  it('2 geboten bei award 3 → aus', () => {
    expect(
      shouldShowLotPriorityGap({
        maxLotsAward: 3,
        lotPriorityRequired: true,
        lots,
      }),
    ).toBe(false)
  })

  it('2 geboten bei award 1 → an', () => {
    expect(
      shouldShowLotPriorityGap({
        maxLotsAward: 1,
        lotPriorityRequired: true,
        lots,
      }),
    ).toBe(true)
  })

  it('ein gesetzter Rang blendet den Hinweis aus', () => {
    expect(
      shouldShowLotPriorityGap({
        maxLotsAward: 1,
        lotPriorityRequired: true,
        lots: lots.map((lot, index) => (index === 2 ? { ...lot, lot_priority: 1 } : lot)),
      }),
    ).toBe(false)
  })

  it('award null → aus', () => {
    expect(
      shouldShowLotPriorityGap({
        maxLotsAward: null,
        lotPriorityRequired: true,
        lots,
      }),
    ).toBe(false)
  })

  it('lot_priority_required false bei award 1 → aus, null wieder an', () => {
    expect(
      shouldShowLotPriorityGap({
        maxLotsAward: 1,
        lotPriorityRequired: false,
        lots,
      }),
    ).toBe(false)
    expect(
      shouldShowLotPriorityGap({
        maxLotsAward: 1,
        lotPriorityRequired: null,
        lots,
      }),
    ).toBe(true)
  })
})

describe('formatLotPriorityGapHint', () => {
  it('interpoliert nur die zwei Zähler', () => {
    expect(formatLotPriorityGapHint(2, 1)).toBe(
      COPY.tenders.priorityGapHint.replace('{bid}', '2').replace('{award}', '1'),
    )
  })
})

describe('orderLotsForPriorityList', () => {
  it('ohne Ränge bleibt die gelieferte Ordnung', () => {
    const input = [
      { id: 'b', lot_priority: null },
      { id: 'a', lot_priority: null },
    ]
    expect(orderLotsForPriorityList(input).map((lot) => lot.id)).toEqual(['b', 'a'])
  })

  it('mit Rängen sortiert nach Rang, null zuletzt', () => {
    const input = [
      { id: 'c', lot_priority: null },
      { id: 'b', lot_priority: 2 },
      { id: 'a', lot_priority: 1 },
    ]
    expect(orderLotsForPriorityList(input).map((lot) => lot.id)).toEqual(['a', 'b', 'c'])
  })
})
