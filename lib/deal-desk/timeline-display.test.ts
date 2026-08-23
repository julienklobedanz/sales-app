import { describe, expect, it } from 'vitest'

import { formatDealDeadlineLabel, normalizeDueTime } from './timeline-display'

describe('normalizeDueTime', () => {
  it('accepts HH:mm and strips Uhr suffix', () => {
    expect(normalizeDueTime('13:00')).toBe('13:00')
    expect(normalizeDueTime('9:05 Uhr')).toBe('09:05')
    expect(normalizeDueTime('13.00')).toBe('13:00')
  })

  it('rejects invalid values', () => {
    expect(normalizeDueTime('25:00')).toBeNull()
    expect(normalizeDueTime('')).toBeNull()
  })
})

describe('formatDealDeadlineLabel', () => {
  it('includes time when dueTime is set', () => {
    const now = new Date('2026-05-30T12:00:00')
    const label = formatDealDeadlineLabel(
      {
        dueDate: '2026-06-12',
        dueTime: '13:00',
        title: 'Q&A / Rückfragenfrist',
      },
      now,
    )
    expect(label).toBe('12.06.2026 (in 13 Tagen) um 13:00 | Q&A / Rückfragenfrist')
  })

  it('omits time when not set', () => {
    const now = new Date('2026-05-30T12:00:00')
    const label = formatDealDeadlineLabel(
      { dueDate: '2026-07-15', title: 'Shortlist-Pitch' },
      now,
    )
    expect(label).toBe('15.07.2026 (in 46 Tagen) | Shortlist-Pitch')
  })
})
