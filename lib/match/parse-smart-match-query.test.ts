import { describe, expect, it } from 'vitest'

import {
  parseExcludeYearsFromQuery,
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
      parseIndustryFromQuery('Managed Services 24/7 für Finanzdienstleister >5 Mio €'),
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

  it('parses älter als 1 Jahr', () => {
    expect(parseRecencyFromQuery('älter als 1 Jahr')).toBe(-12)
  })

  it('parses older than 1 year', () => {
    expect(parseRecencyFromQuery('older than 1 year')).toBe(-12)
  })

  it('parses älter als 3 Jahre', () => {
    expect(parseRecencyFromQuery('älter als 3 Jahre')).toBe(-36)
  })
})

describe('parseExcludeYearsFromQuery', () => {
  it('parses nicht in 2026', () => {
    expect(parseExcludeYearsFromQuery('Referenzen nicht in 2026')).toEqual([2026])
  })

  it('parses Deals nicht in 2026', () => {
    expect(parseExcludeYearsFromQuery('Deals nicht in 2026')).toEqual([2026])
  })

  it('parses ohne 2025', () => {
    expect(parseExcludeYearsFromQuery('ohne 2025')).toEqual([2025])
  })
})

describe('parseSmartMatchQuery', () => {
  it('combines volume industry and recency', () => {
    const p = parseSmartMatchQuery(
      'Managed Services 24/7 für Finanzdienstleister >5 Mio € letzte 24 monate',
    )
    expect(p.minVolume).toBe(5_000_000)
    expect(p.industryId).toBe('fin')
    expect(p.monthsBack).toBe(24)
    expect(p.excludeYears).toEqual([])
    expect(p.found).toEqual({
      volume: true,
      industry: true,
      recency: true,
      excludeYears: false,
      excludeIndustries: false,
      excludeTerms: false,
    })
  })

  it('parses year exclusion with recency', () => {
    const p = parseSmartMatchQuery('Managed Services nicht in 2026 älter als 1 Jahr')
    expect(p.monthsBack).toBe(-12)
    expect(p.excludeYears).toEqual([2026])
    expect(p.found.excludeYears).toBe(true)
  })

  it('parses industry and term negations', () => {
    const p = parseSmartMatchQuery('Managed Services ohne Banking ohne Cloud')
    expect(p.excludeIndustryIds).toContain('fin')
    expect(p.excludeTerms).toContain('cloud')
  })
})

describe('parseStoredVolumeEur', () => {
  it('parses mio strings', () => {
    expect(parseStoredVolumeEur('5 Mio €')).toBe(5_000_000)
    expect(parseStoredVolumeEur('4.500.000')).toBe(4_500_000)
  })
})
