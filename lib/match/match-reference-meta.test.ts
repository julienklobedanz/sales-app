import { describe, expect, it } from 'vitest'

import {
  formatMatchReferenceMetaLine,
  formatMatchReferenceMetaMonthYear,
} from './match-reference-meta'

describe('formatMatchReferenceMetaMonthYear', () => {
  it('formats ISO date as MM/YYYY', () => {
    expect(formatMatchReferenceMetaMonthYear('2025-03-15')).toBe('03/2025')
  })

  it('formats timestamp as MM/YYYY UTC', () => {
    expect(formatMatchReferenceMetaMonthYear('2024-11-01T12:00:00.000Z')).toBe('11/2024')
  })
})

describe('formatMatchReferenceMetaLine', () => {
  it('orders industry · volume · recency', () => {
    expect(
      formatMatchReferenceMetaLine({
        industry: 'fin',
        volumeEur: '4500000',
        createdAt: '2025-03-01',
      }),
    ).toMatch(/^Finanzdienstleistungen/)
    expect(
      formatMatchReferenceMetaLine({
        industry: 'fin',
        volumeEur: '4500000',
        createdAt: '2025-03-01',
      }),
    ).toContain(' · ')
    expect(
      formatMatchReferenceMetaLine({
        industry: 'fin',
        volumeEur: '4500000',
        createdAt: '2025-03-01',
      }),
    ).toContain('03/2025')
  })

  it('omits missing parts', () => {
    expect(
      formatMatchReferenceMetaLine({
        industry: 'fin',
        volumeEur: null,
        createdAt: null,
      }),
    ).toBe('Finanzdienstleistungen & Versicherung')
  })
})
