import { describe, expect, it } from 'vitest'

import {
  buildDealDeadlinesIcsContent,
  dealDeadlinesExportableForIcs,
} from './deal-deadline-ics'
import type { DealDeadlineRow } from './deadline-display'

function row(overrides: Partial<DealDeadlineRow>): DealDeadlineRow {
  return {
    id: 'dl-1',
    deal_id: 'deal-1',
    organization_id: 'org-1',
    kind: 'submission',
    label: 'Angebotsabgabe',
    due_at: '2026-06-12T00:00:00.000Z',
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

describe('deal-deadline-ics', () => {
  it('exports only active deadlines with fixed dates', () => {
    const deadlines = [
      row({}),
      row({ id: 'dl-2', due_at: null, due_text: 'Q3 2026' }),
      row({ id: 'dl-3', suppressed_at: '2026-01-02T00:00:00.000Z' }),
    ]
    expect(dealDeadlinesExportableForIcs(deadlines)).toHaveLength(1)
  })

  it('builds all-day VEVENT entries', () => {
    const ics = buildDealDeadlinesIcsContent({
      dealTitle: 'IAM Rollout',
      dealId: 'deal-1',
      deadlines: [row({})],
    })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260612')
    expect(ics).toContain('DTEND;VALUE=DATE:20260613')
    expect(ics).toContain('IAM Rollout: Angebotsabgabe')
  })
})
