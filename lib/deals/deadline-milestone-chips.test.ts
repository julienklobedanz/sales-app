import { describe, expect, it } from 'vitest'

import { compactRelativeDays } from '@/lib/deals/deadline-milestone-chips'

describe('compactRelativeDays', () => {
  it('uses readable overdue copy instead of a signed day count', () => {
    expect(compactRelativeDays(-1)).toBe('1 Tag überfällig')
    expect(compactRelativeDays(-1469)).toBe('1469 Tage überfällig')
  })

  it('keeps today and upcoming days readable', () => {
    expect(compactRelativeDays(0)).toBe('heute')
    expect(compactRelativeDays(1)).toBe('in 1 Tag')
    expect(compactRelativeDays(12)).toBe('in 12 Tagen')
  })
})
