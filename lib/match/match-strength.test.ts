import { describe, expect, it } from 'vitest'

import { getMatchStrength } from './match-strength'

describe('getMatchStrength', () => {
  it('maps betrugserkennung-bank-like top hit to Hoch', () => {
    const s = getMatchStrength(0.56, { rank: 1, gapToNext: null })
    expect(s.labelShort).toBe('Hoch')
    expect(s.tier).toBe('good')
  })

  it('bumps to Sehr hoch when top hit has large gap', () => {
    const s = getMatchStrength(0.56, { rank: 1, gapToNext: 0.16 })
    expect(s.labelShort).toBe('Sehr hoch')
    expect(s.tier).toBe('excellent')
  })

  it('bumps Gut to Hoch for rank 1 with large gap', () => {
    const s = getMatchStrength(0.5, { rank: 1, gapToNext: 0.14 })
    expect(s.labelShort).toBe('Hoch')
    expect(s.tier).toBe('good')
  })

  it('does not bump when gap is small', () => {
    const s = getMatchStrength(0.5, { rank: 1, gapToNext: 0.05 })
    expect(s.labelShort).toBe('Gut')
    expect(s.tier).toBe('moderate')
  })

  it('maps low similarity without boost', () => {
    const s = getMatchStrength(0.3, { rank: 2 })
    expect(s.labelShort).toBe('Mittel')
    expect(s.tier).toBe('low')
  })

  it('maps scores at homepage threshold to Gut', () => {
    const s = getMatchStrength(0.43, { rank: 1, gapToNext: 0.18 })
    expect(s.labelShort).toBe('Hoch')
    expect(s.tier).toBe('good')
  })

  it('browse sentinel has no fake relevance label', () => {
    const s = getMatchStrength(-1)
    expect(s.tier).toBe('low')
    expect(s.labelShort).toBe('—')
  })
})
