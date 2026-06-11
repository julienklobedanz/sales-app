import { describe, expect, it } from 'vitest'
import {
  enrichHomepageSemanticQuery,
  parseEuroAmountFromQuery,
  parseVolumeConstraintFromQuery,
  referenceVolumeMatchesConstraint,
} from './homepage-semantic-query'

describe('parseEuroAmountFromQuery', () => {
  it('erkennt Millionen-Schreibweisen', () => {
    expect(parseEuroAmountFromQuery('über 2 Millionen Euro')).toBe(2_000_000)
    expect(parseEuroAmountFromQuery('> 2 millionen euro')).toBe(2_000_000)
    expect(parseEuroAmountFromQuery('Projekte >€2Mio')).toBe(2_000_000)
    expect(parseEuroAmountFromQuery('€ 2,5 Mio')).toBe(2_500_000)
  })

  it('erkennt volle Euro-Beträge', () => {
    expect(parseEuroAmountFromQuery('2.500.000 €')).toBe(2_500_000)
  })
})

describe('parseVolumeConstraintFromQuery', () => {
  it('erkennt Mindest-Volumen mit über oder >', () => {
    expect(parseVolumeConstraintFromQuery('Projekte über 2 Millionen Euro')).toEqual({
      operator: 'gte',
      amountEur: 2_000_000,
    })
    expect(parseVolumeConstraintFromQuery('Projekte > 2 Millionen')).toEqual({
      operator: 'gte',
      amountEur: 2_000_000,
    })
    expect(parseVolumeConstraintFromQuery('Projekte >€2Mio')).toEqual({
      operator: 'gte',
      amountEur: 2_000_000,
    })
  })

  it('erkennt Maximal-Volumen', () => {
    expect(parseVolumeConstraintFromQuery('Projekte unter 1 Million')).toEqual({
      operator: 'lte',
      amountEur: 1_000_000,
    })
  })

  it('liefert null ohne Vergleichsoperator', () => {
    expect(parseVolumeConstraintFromQuery('Projekte mit 2 Millionen Euro')).toBeNull()
  })
})

describe('referenceVolumeMatchesConstraint', () => {
  it('filtert nach Mindestvolumen', () => {
    const constraint = { operator: 'gte' as const, amountEur: 2_000_000 }
    expect(referenceVolumeMatchesConstraint('EUR 2500000', constraint)).toBe(true)
    expect(referenceVolumeMatchesConstraint('€ 1.500.000', constraint)).toBe(false)
    expect(referenceVolumeMatchesConstraint(null, constraint)).toBe(false)
  })
})

describe('enrichHomepageSemanticQuery', () => {
  it('reichert Volumen-Vergleiche an', () => {
    const enriched = enrichHomepageSemanticQuery('Projekte >€2Mio')
    expect(enriched).toContain('Volumen mindestens 2000000 EUR')
    expect(enriched).toContain('Projektvolumen größer oder gleich')
  })
})
