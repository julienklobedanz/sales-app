import { describe, expect, it } from 'vitest'

import { buildBidTimelineIcsContent } from './bid-timeline-ics'
import type { DealDeskTimelineItem } from './mock-analysis'
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
      now
    )
    expect(label).toBe('12.06.2026 (in 13 Tagen) um 13:00 | Q&A / Rückfragenfrist')
  })

  it('omits time when not set', () => {
    const now = new Date('2026-05-30T12:00:00')
    const label = formatDealDeadlineLabel(
      { dueDate: '2026-07-15', title: 'Shortlist-Pitch' },
      now
    )
    expect(label).toBe('15.07.2026 (in 46 Tagen) | Shortlist-Pitch')
  })
})

describe('buildBidTimelineIcsContent', () => {
  it('uses all-day DATE events even when dueTime is present', () => {
    const items: DealDeskTimelineItem[] = [
      {
        id: 'tl-1',
        title: 'Q&A',
        dueDate: '2026-06-12',
        dueTime: '13:00',
      },
    ]
    const ics = buildBidTimelineIcsContent({
      customerName: 'Kunde',
      rfpTitle: 'RFP',
      items,
      projectId: 'p1',
    })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260612')
    expect(ics).toContain('DTEND;VALUE=DATE:20260613')
    expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}/)
    expect(ics).toContain('Uhrzeit im RFP: 13:00')
  })

  it('excludes planned service start from calendar export', () => {
    const items: DealDeskTimelineItem[] = [
      {
        id: 'tl-qa',
        title: 'Q&A / Rückfragenfrist',
        dueDate: '2026-06-12',
      },
      {
        id: 'tl-start',
        title: 'Geplanter Servicebeginn',
        dueDate: '2026-09-01',
      },
    ]
    const ics = buildBidTimelineIcsContent({
      customerName: 'Kunde',
      rfpTitle: 'RFP',
      items,
    })
    expect(ics).toContain('Q&A')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260612')
    expect(ics).not.toContain('Servicebeginn')
    expect(ics).not.toContain('20260901')
  })
})
