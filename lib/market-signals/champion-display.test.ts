import { describe, expect, it } from 'vitest'
import { formatExecutiveMetaLine, personInitials } from './champion-display'

describe('formatExecutiveMetaLine', () => {
  it('joins title and company', () => {
    expect(formatExecutiveMetaLine('CEO', 'Apple')).toBe('CEO · Apple')
  })

  it('falls back to company only', () => {
    expect(formatExecutiveMetaLine(null, 'Apple')).toBe('Apple')
  })

  it('falls back to title only', () => {
    expect(formatExecutiveMetaLine('CEO', null)).toBe('CEO')
  })

  it('uses em dash when empty', () => {
    expect(formatExecutiveMetaLine(null, null)).toBe('—')
  })
})

describe('personInitials', () => {
  it('uses first and last', () => {
    expect(personInitials('Tim Cook')).toBe('TC')
  })

  it('uses two letters for single name', () => {
    expect(personInitials('Madonna')).toBe('MA')
  })
})
