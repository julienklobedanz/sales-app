import { describe, expect, it } from 'vitest'

import {
  companyNamesEquivalent,
  companyNameSearchToken,
  displayCompanyNameForImport,
  normalizeCompanyNameForMatch,
  stripLegalSuffixFromCompanyName,
} from './account-name-match'

describe('companyNamesEquivalent', () => {
  it('gleicht Aurubis und Aurubis AG ab', () => {
    expect(companyNamesEquivalent('Aurubis AG', 'Aurubis')).toBe(true)
    expect(companyNamesEquivalent('Aurubis', 'Aurubis AG')).toBe(true)
  })

  it('unterscheidet verschiedene Firmen', () => {
    expect(companyNamesEquivalent('BMW AG', 'Aurubis')).toBe(false)
  })
})

describe('normalizeCompanyNameForMatch', () => {
  it('entfernt Rechtsform-Suffixe', () => {
    expect(normalizeCompanyNameForMatch('Siemens AG')).toBe('siemens')
    expect(normalizeCompanyNameForMatch('Muster GmbH')).toBe('muster')
  })
})

describe('companyNameSearchToken', () => {
  it('liefert Suchkern für DB', () => {
    expect(companyNameSearchToken('Aurubis AG')).toBe('aurubis')
  })
})

describe('displayCompanyNameForImport', () => {
  it('nutzt Brandfetch-Namen ohne AG', () => {
    expect(displayCompanyNameForImport('Aurubis AG', 'Aurubis')).toBe('Aurubis')
  })

  it('streift AG ohne Brandfetch', () => {
    expect(displayCompanyNameForImport('Aurubis AG', null)).toBe('Aurubis')
    expect(stripLegalSuffixFromCompanyName('Siemens AG')).toBe('Siemens')
  })
})
