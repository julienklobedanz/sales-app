import { describe, expect, it } from 'vitest'
import {
  filterReferencesForSales,
  isReferenceVisibleToSales,
} from './sales-reference-visibility'

describe('sales-reference-visibility', () => {
  it('allows approved, internal_only, and anonymized', () => {
    expect(isReferenceVisibleToSales('approved')).toBe(true)
    expect(isReferenceVisibleToSales('internal_only')).toBe(true)
    expect(isReferenceVisibleToSales('anonymized')).toBe(true)
  })

  it('blocks draft', () => {
    expect(isReferenceVisibleToSales('draft')).toBe(false)
  })

  it('filters reference rows for sales', () => {
    const rows = [
      { id: '1', status: 'approved' },
      { id: '2', status: 'anonymized' },
      { id: '3', status: 'draft' },
    ]
    expect(filterReferencesForSales(rows).map((r) => r.id)).toEqual(['1', '2'])
  })
})
