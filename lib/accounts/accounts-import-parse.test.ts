import { describe, expect, it } from 'vitest'

import {
  normalizePartnerCategoryFromImport,
  parseAccountsImportRow,
  parseEmployeeCountFromImport,
  pickSheetRowValue,
} from './accounts-import-parse'

describe('pickSheetRowValue', () => {
  it('finds the first non-empty alias', () => {
    expect(
      pickSheetRowValue({ Name: ' Acme ', website: 'x.com' }, ['website', 'Name']),
    ).toBe('x.com')
    expect(pickSheetRowValue({ Unternehmen: 'Beta GmbH' }, ['name', 'Unternehmen'])).toBe(
      'Beta GmbH',
    )
  })
})

describe('parseEmployeeCountFromImport', () => {
  it('parses digits and ignores formatting', () => {
    expect(parseEmployeeCountFromImport('1.200')).toBe(1200)
    expect(parseEmployeeCountFromImport('')).toBeNull()
    expect(parseEmployeeCountFromImport('n/a')).toBeNull()
  })
})

describe('normalizePartnerCategoryFromImport', () => {
  it('maps German and English aliases', () => {
    expect(normalizePartnerCategoryFromImport('Subunternehmer')).toBe('sub')
    expect(normalizePartnerCategoryFromImport('Technologie')).toBe('tech')
    expect(normalizePartnerCategoryFromImport('')).toBe('other')
  })
})

describe('parseAccountsImportRow', () => {
  it('skips rows without a name', () => {
    expect(parseAccountsImportRow({ Website: 'https://a.de' }, 'account')).toBeNull()
  })

  it('parses account rows without partner category', () => {
    expect(
      parseAccountsImportRow(
        {
          Name: 'Acme',
          Branche: 'IT',
          Mitarbeiter: '50',
        },
        'account',
      ),
    ).toEqual({
      name: 'Acme',
      website: '',
      industry: 'IT',
      headquarters: '',
      employeeCount: 50,
      partnerCategory: null,
    })
  })

  it('parses partner rows with category', () => {
    expect(
      parseAccountsImportRow({ Name: 'Partner AG', Kategorie: 'legal' }, 'partner'),
    ).toMatchObject({
      name: 'Partner AG',
      partnerCategory: 'legal',
    })
  })
})
