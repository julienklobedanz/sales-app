import { describe, expect, it } from 'vitest'

import { timelineDueToIso } from './deadline-rfp-mapper'
import {
  dueAtToDateIso,
  canMarkDeadlineAsSubmissionTarget,
  isTenderOwnedDeadline,
  mergeLotAndTenderDeadlines,
  type DealDeadlineRow,
} from './deadline-display'

function row(overrides: Partial<DealDeadlineRow>): DealDeadlineRow {
  return {
    id: 'dl-1',
    deal_id: 'deal-1',
    tender_id: null,
    organization_id: 'org-1',
    kind: 'submission',
    label: 'Angebotsabgabe',
    due_at: '2026-06-12T12:00:00.000Z',
    due_text: null,
    is_approximate: false,
    source: 'rfp',
    source_key: 'k',
    suppressed_at: null,
    pinned: false,
    is_submission_target: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('deadline display owner helpers', () => {
  it('treats tender_id without deal_id as inherited', () => {
    expect(isTenderOwnedDeadline(row({ deal_id: null, tender_id: 'tender-1' }))).toBe(
      true,
    )
    expect(isTenderOwnedDeadline(row({ deal_id: 'deal-1', tender_id: null }))).toBe(false)
  })

  it('hides the Abgabe toggle on inherited lot deadlines', () => {
    expect(
      canMarkDeadlineAsSubmissionTarget('deal', {
        deal_id: null,
        tender_id: 'tender-1',
      }),
    ).toBe(false)
    expect(
      canMarkDeadlineAsSubmissionTarget('tender', {
        deal_id: null,
        tender_id: 'tender-1',
      }),
    ).toBe(true)
    expect(
      canMarkDeadlineAsSubmissionTarget('deal', {
        deal_id: 'deal-1',
        tender_id: null,
      }),
    ).toBe(true)
  })

  it('merges lot and tender rows sorted by due_at', () => {
    const merged = mergeLotAndTenderDeadlines(
      [row({ id: 'lot', due_at: '2026-09-02T12:00:00.000Z', label: 'Los' })],
      [
        row({
          id: 'tender',
          deal_id: null,
          tender_id: 'tender-1',
          due_at: '2026-09-01T12:00:00.000Z',
          label: 'Ausschreibung',
        }),
      ],
    )
    expect(merged.map((d) => d.id)).toEqual(['tender', 'lot'])
  })
})

describe('dueAtToDateIso', () => {
  it('keeps the calendar day for every date and time timelineDueToIso writes', () => {
    const dates = ['2026-01-01', '2026-10-15', '2026-12-31']
    const times = [null, '00:00', '09:30', '12:00', '23:59']
    for (const date of dates) {
      for (const time of times) {
        const written = timelineDueToIso(date, time)
        expect(written, `${date} ${time ?? 'ohne Zeit'}`).toBeTruthy()
        expect(dueAtToDateIso(written!)).toBe(date)
      }
    }
  })
})
