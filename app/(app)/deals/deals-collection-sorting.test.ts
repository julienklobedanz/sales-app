import { describe, expect, it } from 'vitest'

import {
  DEALS_COLLECTION_DEFAULT_SORTING,
  isDealsCollectionGroupedSorting,
  resolveDealsCollectionSorting,
} from './deals-collection-sorting'

describe('deals collection sorting', () => {
  it('erkennt die gruppierte Standardansicht', () => {
    expect(isDealsCollectionGroupedSorting(DEALS_COLLECTION_DEFAULT_SORTING)).toBe(true)
    expect(isDealsCollectionGroupedSorting([])).toBe(false)
    expect(isDealsCollectionGroupedSorting([{ id: 'volume', desc: true }])).toBe(false)
  })

  it('stellt nach aufgehobener Spaltensortierung die Gruppierung wieder her', () => {
    expect(resolveDealsCollectionSorting([])).toEqual(DEALS_COLLECTION_DEFAULT_SORTING)
    expect(resolveDealsCollectionSorting(DEALS_COLLECTION_DEFAULT_SORTING)).toEqual(
      DEALS_COLLECTION_DEFAULT_SORTING,
    )
  })

  it('behält eine sichtbare Spaltensortierung und streicht collectionOrder', () => {
    expect(
      resolveDealsCollectionSorting([
        { id: 'collectionOrder', desc: false },
        { id: 'volume', desc: true },
      ]),
    ).toEqual([{ id: 'volume', desc: true }])
  })
})
