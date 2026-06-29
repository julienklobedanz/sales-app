import { describe, expect, it } from 'vitest'
import { isCompanyDetailTab, normalizeCompanyDetailTab } from './company-detail-tabs'

describe('normalizeCompanyDetailTab', () => {
  it('maps legacy tab values to proof-linse tabs', () => {
    expect(normalizeCompanyDetailTab(null)).toBe('overview')
    expect(normalizeCompanyDetailTab('mission_control')).toBe('overview')
    expect(normalizeCompanyDetailTab('buying_center')).toBe('overview')
    expect(normalizeCompanyDetailTab('pipeline')).toBe('deals')
    expect(normalizeCompanyDetailTab('proof_points')).toBe('references')
  })

  it('accepts new tab ids', () => {
    expect(normalizeCompanyDetailTab('overview')).toBe('overview')
    expect(normalizeCompanyDetailTab('deals')).toBe('deals')
    expect(normalizeCompanyDetailTab('references')).toBe('references')
  })

  it('falls back to overview for unknown values', () => {
    expect(normalizeCompanyDetailTab('unknown')).toBe('overview')
  })
})

describe('isCompanyDetailTab', () => {
  it('validates canonical tab ids', () => {
    expect(isCompanyDetailTab('overview')).toBe(true)
    expect(isCompanyDetailTab('mission_control')).toBe(false)
  })
})
