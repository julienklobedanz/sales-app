import { describe, expect, it } from 'vitest'

import {
  isActiveDealStatus,
  normalizeDealStatus,
  parseOptionalDealStatus,
} from './normalize-deal-status'

describe('normalizeDealStatus', () => {
  it('maps legacy values and defaults unknown to open', () => {
    expect(normalizeDealStatus('in_negotiation')).toBe('negotiation')
    expect(normalizeDealStatus('rfp_phase')).toBe('rfp')
    expect(normalizeDealStatus('on_hold')).toBe('open')
    expect(normalizeDealStatus('won')).toBe('won')
    expect(normalizeDealStatus('')).toBe('open')
    expect(normalizeDealStatus('nope')).toBe('open')
  })
})

describe('parseOptionalDealStatus', () => {
  it('returns null for empty input', () => {
    expect(parseOptionalDealStatus('')).toBeNull()
    expect(parseOptionalDealStatus(null)).toBeNull()
    expect(parseOptionalDealStatus('rfp')).toBe('rfp')
  })
})

describe('isActiveDealStatus', () => {
  it('treats open/rfp/negotiation and their legacy aliases as active', () => {
    expect(isActiveDealStatus('open')).toBe(true)
    expect(isActiveDealStatus('in_negotiation')).toBe(true)
    expect(isActiveDealStatus('won')).toBe(false)
    expect(isActiveDealStatus('')).toBe(false)
    expect(isActiveDealStatus('nope')).toBe(false)
  })
})
