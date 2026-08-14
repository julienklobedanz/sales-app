import { describe, expect, it } from 'vitest'

import {
  buildBidProgressTimeline,
  formatBidTimelineRelativeLabel,
  isCoreBidMilestone,
  isVergabeMilestone,
  resolveVergabeDate,
} from './bid-timeline-milestones'
import type { DealDeskTimelineItem } from './deal-analysis-types'

const items: DealDeskTimelineItem[] = [
  { id: 'v', title: 'Bekanntmachung / Vergabe', dueDate: '2026-05-22' },
  { id: '1', title: 'Q&A / Rückfragenfrist', dueDate: '2026-06-12' },
  { id: '2', title: 'Angebotsabgabe (Deadline)', dueDate: '2026-06-19' },
  { id: '3', title: 'Voraussichtlicher Shortlist-Pitch', dueDate: '2026-07-15' },
  { id: '4', title: 'Geplanter Servicebeginn', dueDate: '2026-09-01' },
]

describe('buildBidProgressTimeline', () => {
  it('anchors vergabe at 0% and submission at 100%', () => {
    const now = new Date('2026-06-01T12:00:00')
    const points = buildBidProgressTimeline(items, now)!
    expect(points[0]?.label).toBe('VERGABE')
    expect(points[0]?.positionPct).toBe(0)
    expect(points.find((p) => p.label === 'ABGABE')?.positionPct).toBe(100)
  })

  it('positions today proportionally between vergabe and submission', () => {
    const now = new Date('2026-06-01T12:00:00')
    const points = buildBidProgressTimeline(items, now)!
    const today = points.find((p) => p.kind === 'today')
    expect(today?.positionPct).toBeGreaterThan(0)
    expect(today?.positionPct).toBeLessThan(100)
  })

  it('excludes post-submission events from milestones', () => {
    const now = new Date('2026-06-01T12:00:00')
    const points = buildBidProgressTimeline(items, now)!
    const labels = points.map((p) => p.label)
    expect(labels).not.toContain('PRÄSENTATION')
  })
})

describe('isVergabeMilestone', () => {
  it('detects vergabe titles', () => {
    expect(isVergabeMilestone('Bekanntmachung / Vergabe')).toBe(true)
    expect(isCoreBidMilestone('Bekanntmachung / Vergabe')).toBe(false)
  })
})

describe('resolveVergabeDate', () => {
  it('uses explicit vergabe from items', () => {
    expect(resolveVergabeDate(items, '2026-06-19', '2026-06-01')).toBe('2026-05-22')
  })
})

describe('formatBidTimelineRelativeLabel', () => {
  it('formats relative days', () => {
    expect(formatBidTimelineRelativeLabel(-5)).toBe('vor 5T')
    expect(formatBidTimelineRelativeLabel(0)).toBe('Heute')
    expect(formatBidTimelineRelativeLabel(19)).toBe('in 19T')
  })
})
