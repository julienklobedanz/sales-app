import { describe, expect, it } from 'vitest'

import {
  REFERENCE_CONTENT_FIELD_IDS,
  REFERENCE_CONTENT_HISTORY_FIELDS,
  REFERENCE_CONTENT_REDUCED_FIELDS,
  visibleReferenceContentFields,
  type ReferenceContentFieldValues,
} from './reference-content-fields'

const fullFixture: ReferenceContentFieldValues = {
  summary: 'Ergebnis in einem Satz',
  usabilityStatement: 'Extern nutzbar — Freigabe außerhalb von RefStack',
  competitorBlacklist: ['Konkurrent AG'],
  challenge: 'Die Ausgangslage',
  solution: 'Die Lösung',
  volume: '120000',
  contractType: 'Festpreis',
  projectStart: '2024-01-01',
  projectEnd: '2024-12-31',
  incumbentProvider: 'Alt-Dienstleister',
  competitors: 'Mitbieter GmbH',
  customerContact: 'Lisa Kunde',
  salesContact: 'Max Sales',
  files: [{ key: 'a' }],
}

describe('visibleReferenceContentFields', () => {
  it('internal shows every filled field in every role, including the blacklist', () => {
    const sales = visibleReferenceContentFields('internal', fullFixture)
    const other = visibleReferenceContentFields('internal', fullFixture)
    expect(sales).toEqual([...REFERENCE_CONTENT_FIELD_IDS])
    expect(other).toEqual([...REFERENCE_CONTENT_FIELD_IDS])
    expect(sales).toContain('competitorBlacklist')
    expect(sales).not.toEqual(expect.arrayContaining([...REFERENCE_CONTENT_HISTORY_FIELDS]))
  })

  it('reduced shows only narrative fields and never the blacklist', () => {
    const reduced = visibleReferenceContentFields('reduced', fullFixture)
    expect(reduced).toEqual([...REFERENCE_CONTENT_REDUCED_FIELDS])
    expect(reduced).not.toContain('competitorBlacklist')
    expect(reduced).not.toContain('usabilityStatement')
    expect(reduced).not.toContain('volume')
  })

  it('omits empty fields and empty blacklist', () => {
    expect(
      visibleReferenceContentFields('internal', {
        summary: '  ',
        challenge: 'Lage',
        competitorBlacklist: ['  '],
        files: [],
      }),
    ).toEqual(['challenge'])
  })

  it('never exposes history as a content field', () => {
    for (const field of REFERENCE_CONTENT_HISTORY_FIELDS) {
      expect(REFERENCE_CONTENT_FIELD_IDS).not.toContain(field)
    }
  })
})
