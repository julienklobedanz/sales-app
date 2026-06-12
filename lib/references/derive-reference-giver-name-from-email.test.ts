import { describe, expect, it } from 'vitest'

import { deriveReferenceGiverNameFromEmail } from './derive-reference-giver-name-from-email'

describe('deriveReferenceGiverNameFromEmail', () => {
  it('parses first.last from email local part', () => {
    expect(deriveReferenceGiverNameFromEmail('alex.stoepel@web.de')).toBe('Alex Stoepel')
    expect(deriveReferenceGiverNameFromEmail('maria.mueller@example.com')).toBe('Maria Mueller')
  })

  it('supports underscore and hyphen separators', () => {
    expect(deriveReferenceGiverNameFromEmail('alex_stoepel@web.de')).toBe('Alex Stoepel')
    expect(deriveReferenceGiverNameFromEmail('alex-stoepel@web.de')).toBe('Alex Stoepel')
  })

  it('capitalizes a single local part', () => {
    expect(deriveReferenceGiverNameFromEmail('alex@web.de')).toBe('Alex')
  })

  it('returns null for invalid input', () => {
    expect(deriveReferenceGiverNameFromEmail('')).toBeNull()
    expect(deriveReferenceGiverNameFromEmail('not-an-email')).toBeNull()
  })
})
