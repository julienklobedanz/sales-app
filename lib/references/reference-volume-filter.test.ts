import { describe, expect, it } from 'vitest'

import {
  matchesReferenceVolumeFilter,
  referenceVolumeAmountEur,
} from './reference-volume-filter'

describe('reference-volume-filter', () => {
  it('parses EUR amounts', () => {
    expect(referenceVolumeAmountEur('EUR 250000')).toBe(250_000)
    expect(referenceVolumeAmountEur('€ 1.200.000')).toBe(1_200_000)
    expect(referenceVolumeAmountEur(null)).toBeNull()
  })

  it('matches volume bands', () => {
    expect(matchesReferenceVolumeFilter('EUR 50000', 'under_100k')).toBe(true)
    expect(matchesReferenceVolumeFilter('EUR 50000', '100k_500k')).toBe(false)
    expect(matchesReferenceVolumeFilter('EUR 750000', '500k_1m')).toBe(true)
    expect(matchesReferenceVolumeFilter('', 'unspecified')).toBe(true)
    expect(matchesReferenceVolumeFilter('EUR 100000', 'unspecified')).toBe(false)
  })
})
