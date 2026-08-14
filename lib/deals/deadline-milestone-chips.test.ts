import { describe, expect, it } from 'vitest'

import type { DealDeadlineRow } from './deadline-display'
import {
  buildDeadlineMilestoneChips,
  compactRelativeDays,
} from './deadline-milestone-chips'

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

function row(overrides: Partial<DealDeadlineRow>): DealDeadlineRow {
  return {
    id: 'dl-1',
    deal_id: 'deal-1',
    organization_id: 'org-1',
    kind: 'submission',
    label: 'Angebotsabgabe',
    due_at: '2020-01-01T00:00:00.000Z',
    due_text: null,
    is_approximate: false,
    source: 'rfp',
    source_key: 'submission',
    suppressed_at: null,
    pinned: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildDeadlineMilestoneChips', () => {
  const now = new Date('2026-08-14T12:00:00.000Z')

  it('keeps overdue chips visible without warn tone on closed deals', () => {
    const chips = buildDeadlineMilestoneChips([row({})], {
      now,
      dealStatus: 'won',
    })
    expect(chips).toHaveLength(1)
    expect(chips[0].isOverdue).toBe(true)
    expect(chips[0].showOverdueTone).toBe(false)
  })

  it('warns on overdue chips while the deal is still open', () => {
    const chips = buildDeadlineMilestoneChips([row({})], {
      now,
      dealStatus: 'rfp',
    })
    expect(chips).toHaveLength(1)
    expect(chips[0].showOverdueTone).toBe(true)
  })
})
