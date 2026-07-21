import { describe, expect, it } from 'vitest'

import {
  parseIndustryFromQuery,
  parseMinVolumeFromQuery,
  parseRecencyFromQuery,
  parseSmartMatchQuery,
  parseStoredVolumeEur,
} from './parse-smart-match-query'

describe('parseMinVolumeFromQuery', () => {
  it.each([
    ['>5M', 5_000_000],
    ['>5m', 5_000_000],
    ['> 5 Mio', 5_000_000],
    ['>5 Mio €', 5_000_000],
    ['>€5m', 5_000_000],
    ['> €5 Mio', 5_000_000],
    ['über 5 Mio', 5_000_000],
    ['Managed Services >5 Mio €', 5_000_000],
    ['Projekte ab 2 mio', 2_000_000],
  ])('%s → %i', (q, expected) => {
    expect(parseMinVolumeFromQuery(q)).toBe(expected)
  })
})

describe('parseIndustryFromQuery', () => {
  it('maps Finanzdienstleister to fin', () => {
    expect(
      parseIndustryFromQuery('Managed Services 24/7 für Finanzdienstleister >5 Mio €')
    ).toBe('fin')
  })
})

describe('parseRecencyFromQuery', () => {
  it('parses letzte 24 monate', () => {
    expect(parseRecencyFromQuery('… letzte 24 monate')).toBe(24)
  })

  it('parses älter als 36 Monate', () => {
    expect(parseRecencyFromQuery('älter als 36 Monate')).toBe(-36)
  })
})

describe('parseSmartMatchQuery', () => {
  it('combines volume industry and recency', () => {
    const p = parseSmartMatchQuery(
      'Managed Services 24/7 für Finanzdienstleister >5 Mio € letzte 24 monate'
    )
    expect(p.minVolume).toBe(5_000_000)
    expect(p.industryId).toBe('fin')
    expect(p.monthsBack).toBe(24)
    expect(p.found).toEqual({ volume: true, industry: true, recency: true })
  })
})

describe('parseStoredVolumeEur', () => {
  it('parses mio strings', () => {
    expect(parseStoredVolumeEur('5 Mio €')).toBe(5_000_000)
    expect(parseStoredVolumeEur('4.500.000')).toBe(4_500_000)
  })
})
