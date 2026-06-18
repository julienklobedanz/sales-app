import { describe, expect, it } from 'vitest'

import {
  deadlineCountdownBadgeClass,
  deadlineRowTitleClass,
  formatBidVolumeDisplay,
  formatRelativeCountdownLabel,
  resolveBidOverviewMeta,
  resolveNextRfpDeadline,
  shortenPersonName,
} from './bid-overview-meta'
import type { DealDeskTimelineItem } from './mock-analysis'

const timeline: DealDeskTimelineItem[] = [
  { id: '1', title: 'Q&A / Rückfragenfrist', dueDate: '2026-06-20', dueTime: '13:00' },
  { id: '2', title: 'Angebotsabgabe (Deadline)', dueDate: '2026-06-25' },
]

describe('formatBidVolumeDisplay', () => {
  it('formats ca. 1.2M as full euro million range', () => {
    const v = formatBidVolumeDisplay('ca. 1.2M € TCV')
    expect(v.label).toBe('€ 1.000.000 - € 2.000.000')
    expect(v.isAiEstimate).toBe(true)
  })

  it('formats explicit M range with german thousands', () => {
    const v = formatBidVolumeDisplay('10M - 20M €')
    expect(v.label).toBe('€ 10.000.000 - € 20.000.000')
    expect(v.isAiEstimate).toBe(true)
  })

  it('formats exact amount without M shorthand', () => {
    const v = formatBidVolumeDisplay('€ 1500000')
    expect(v.label).toBe('€ 1.500.000')
    expect(v.isAiEstimate).toBe(false)
  })
})

describe('resolveNextRfpDeadline', () => {
  it('picks earliest upcoming deadline', () => {
    const now = new Date('2026-06-01T12:00:00')
    const next = resolveNextRfpDeadline(timeline, null, now)
    expect(next?.dateDe).toBe('20.06.2026')
    expect(next?.timeDe).toBe('13:00 Uhr')
    expect(next?.detail).toBe('Q&A')
  })

  it('parses time from briefing deadline text', () => {
    const next = resolveNextRfpDeadline([], '19.06.2026, 17:00', new Date('2026-06-01'))
    expect(next?.dateDe).toBe('19.06.2026')
    expect(next?.timeDe).toBe('17:00 Uhr')
  })
})

describe('resolveBidOverviewMeta', () => {
  it('builds meta from briefing and team', () => {
    const meta = resolveBidOverviewMeta(
      {
        executiveBriefing: {
          submissionDeadline: '19.06.2026',
          expectedDealVolume: 'ca. 1.2M € TCV',
          projectLocation: 'Berlin, DE',
        },
        timelineItems: timeline,
      },
      {
        userId: 'u1',
        fullName: 'Alex Stern',
        avatarUrl: 'https://example.com/a.jpg',
      }
    )
    expect(meta.volume).not.toBe('—')
    expect(meta.volumeIsAiEstimate).toBe(true)
    expect(meta.ownerName).toBe('Alex Stern')
    expect(meta.ownerAvatarUrl).toBe('https://example.com/a.jpg')
    expect(meta.nextDeadlineDate).toBe('20.06.2026')
    expect(meta.nextDeadlineTime).toBe('13:00 Uhr')
    expect(meta.location).toBe('Berlin, DE')
    expect(meta.ownerInitials.length).toBeGreaterThan(0)
  })
})

describe('deadline styling helpers', () => {
  it('submission under 20 days uses red title', () => {
    expect(deadlineRowTitleClass(9, 'Angebotsabgabe (Deadline)')).toContain('red')
  })

  it('countdown badge is orange under 10 days', () => {
    expect(deadlineCountdownBadgeClass(9)).toContain('amber')
  })

  it('countdown badge is red under 3 days', () => {
    expect(deadlineCountdownBadgeClass(2)).toContain('red')
  })

  it('relative label without parentheses', () => {
    expect(formatRelativeCountdownLabel(9)).toBe('In 9 Tagen')
  })
})

describe('shortenPersonName', () => {
  it('shortens two-part names', () => {
    expect(shortenPersonName('Alex Stern')).toBe('Alex S.')
  })
})
