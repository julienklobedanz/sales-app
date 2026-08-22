import { describe, expect, it } from 'vitest'

import {
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

describe('parseAccountsImportRow', () => {
  it('skips rows without a name', () => {
    expect(parseAccountsImportRow({ Website: 'https://a.de' })).toBeNull()
  })

  it('parses account rows', () => {
    expect(
      parseAccountsImportRow({
        Name: 'Acme',
        Branche: 'IT',
        Mitarbeiter: '50',
      }),
    ).toEqual({
      name: 'Acme',
      website: '',
      industry: 'IT',
      headquarters: '',
      employeeCount: 50,
    })
  })
})
