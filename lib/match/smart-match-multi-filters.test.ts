import { describe, expect, it } from 'vitest'

import {
  createdAtMatchesAnyRecency,
  volumeBandFromMinVolume,
  volumeMatchesAnyBand,
  volumeMatchesBand,
} from './smart-match-multi-filters'

describe('volumeMatchesBand', () => {
  it('matches lt1 and gte bands', () => {
    expect(volumeMatchesBand(500_000, 'lt1')).toBe(true)
    expect(volumeMatchesBand(1_000_000, 'lt1')).toBe(false)
    expect(volumeMatchesBand(1_000_000, 'gte1')).toBe(true)
    expect(volumeMatchesBand(5_000_000, 'gte5')).toBe(true)
    expect(volumeMatchesBand(4_999_999, 'gte5')).toBe(false)
  })
})

describe('volumeMatchesAnyBand', () => {
  it('ORs selected bands', () => {
    expect(volumeMatchesAnyBand('800000', ['lt1', 'gte5'])).toBe(true)
    expect(volumeMatchesAnyBand('3000000', ['lt1', 'gte5'])).toBe(false)
    expect(volumeMatchesAnyBand('6000000', ['lt1', 'gte5'])).toBe(true)
  })

  it('passes when no bands', () => {
    expect(volumeMatchesAnyBand('100', [])).toBe(true)
  })
})

describe('volumeBandFromMinVolume', () => {
  it('maps parsed query mins', () => {
    expect(volumeBandFromMinVolume(5_000_000)).toBe('gte5')
    expect(volumeBandFromMinVolume(1_000_000)).toBe('gte1')
  })
})

describe('createdAtMatchesAnyRecency', () => {
  const now = new Date('2026-07-21T12:00:00.000Z')

  it('ANDs multiple windows (contradictory → no match)', () => {
    const recent = '2026-01-01T00:00:00.000Z'
    const old = '2020-01-01T00:00:00.000Z'
    // „letzte 12“ und „älter als 36“ schließen sich aus
    expect(createdAtMatchesAnyRecency(recent, [12, -36], now)).toBe(false)
    expect(createdAtMatchesAnyRecency(old, [12, -36], now)).toBe(false)
    expect(createdAtMatchesAnyRecency(recent, [12], now)).toBe(true)
    expect(createdAtMatchesAnyRecency(old, [-36], now)).toBe(true)
    expect(createdAtMatchesAnyRecency('2023-01-01T00:00:00.000Z', [12], now)).toBe(false)
  })
})
