import { describe, expect, it } from 'vitest'

import { companyFromJoin } from './company-from-join'

describe('companyFromJoin', () => {
  it('unwraps object and array joins', () => {
    expect(
      companyFromJoin({
        id: 'c1',
        name: 'Acme',
        logo_url: 'https://x/logo.png',
        is_favorite: true,
      }),
    ).toEqual({
      id: 'c1',
      name: 'Acme',
      logoUrl: 'https://x/logo.png',
      isFavorite: true,
    })
    expect(companyFromJoin([{ name: 'Beta', logo_url: null }])).toEqual({
      id: null,
      name: 'Beta',
      logoUrl: null,
      isFavorite: false,
    })
  })

  it('returns null when empty unless fallbackName is set', () => {
    expect(companyFromJoin(null)).toBeNull()
    expect(companyFromJoin({})).toBeNull()
    expect(companyFromJoin(null, { fallbackName: 'Account' })).toEqual({
      id: null,
      name: 'Account',
      logoUrl: null,
      isFavorite: false,
    })
  })
})
