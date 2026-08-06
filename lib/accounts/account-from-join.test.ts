import { describe, expect, it } from 'vitest'

import { accountFromJoin } from './account-from-join'

describe('accountFromJoin', () => {
  it('unwraps object and array joins', () => {
    expect(
      accountFromJoin({
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
    expect(accountFromJoin([{ name: 'Beta', logo_url: null }])).toEqual({
      id: null,
      name: 'Beta',
      logoUrl: null,
      isFavorite: false,
    })
  })

  it('returns null when empty unless fallbackName is set', () => {
    expect(accountFromJoin(null)).toBeNull()
    expect(accountFromJoin({})).toBeNull()
    expect(accountFromJoin(null, { fallbackName: 'Account' })).toEqual({
      id: null,
      name: 'Account',
      logoUrl: null,
      isFavorite: false,
    })
  })
})
