import { describe, expect, it } from 'vitest'

import {
  compareResolvedDeadlines,
  resolveDealDeadline,
  type SubmissionDeadlineInput,
} from './resolve-deal-deadline'

function submission(
  overrides: Partial<SubmissionDeadlineInput> = {},
): SubmissionDeadlineInput {
  return {
    due_at: '2026-09-30T12:00:00.000Z',
    due_text: null,
    is_approximate: false,
    suppressed_at: null,
    ...overrides,
  }
}

describe('resolveDealDeadline', () => {
  it('falls back to expiry_date when no submission exists (legacy)', () => {
    expect(
      resolveDealDeadline({
        lotSubmissions: [],
        tenderSubmissions: [],
        expiryDate: '2026-11-01',
      }),
    ).toEqual({
      date: '2026-11-01',
      text: null,
      isApproximate: false,
      origin: 'legacy',
    })
  })

  it('lets the lot submission win over the tender submission', () => {
    expect(
      resolveDealDeadline({
        lotSubmissions: [submission({ due_at: '2026-08-01T12:00:00.000Z' })],
        tenderSubmissions: [submission({ due_at: '2026-10-15T12:00:00.000Z' })],
        expiryDate: '2026-09-01',
      }),
    ).toMatchObject({ date: '2026-08-01', origin: 'lot' })
  })

  it('ignores suppressed submissions and falls back', () => {
    expect(
      resolveDealDeadline({
        lotSubmissions: [
          submission({
            due_at: '2026-08-01T12:00:00.000Z',
            suppressed_at: '2026-07-01T00:00:00.000Z',
          }),
        ],
        tenderSubmissions: [],
        expiryDate: '2026-11-01',
      }),
    ).toMatchObject({ date: '2026-11-01', origin: 'legacy' })
  })

  it('shows due_text without due_at and does not invent a date', () => {
    expect(
      resolveDealDeadline({
        lotSubmissions: [
          submission({
            due_at: null,
            due_text: 'September 2026',
            is_approximate: true,
          }),
        ],
        tenderSubmissions: [],
        expiryDate: '2026-09-01',
      }),
    ).toEqual({
      date: null,
      text: 'September 2026',
      isApproximate: true,
      origin: 'lot',
    })
  })

  it('sorts dated deadlines first; text-only and empty last', () => {
    const lot = {
      date: '2026-10-15',
      text: null,
      isApproximate: false,
      origin: 'lot' as const,
    }
    const tender = {
      date: '2026-09-01',
      text: null,
      isApproximate: false,
      origin: 'tender' as const,
    }
    const textOnly = {
      date: null,
      text: 'September 2026',
      isApproximate: true,
      origin: 'lot' as const,
    }
    const empty = {
      date: null,
      text: null,
      isApproximate: false,
      origin: 'legacy' as const,
    }
    const mixed = [textOnly, lot, empty, tender].sort(compareResolvedDeadlines)
    expect(mixed.map((item) => item.origin + (item.date ?? item.text ?? '—'))).toEqual([
      'tender2026-09-01',
      'lot2026-10-15',
      'lotSeptember 2026',
      'legacy—',
    ])
  })
})
