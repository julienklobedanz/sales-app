import { describe, expect, it } from 'vitest'

import {
  countSubmissionItems,
  cycleSubmissionItemStateFields,
  formatSubmissionItemCounts,
  formatSubmissionWorkspaceTileState,
  isReferenceListItem,
  isUnreviewedSubmissionItem,
  isVisibleSubmissionItem,
  nextSubmissionItemState,
  shouldAutoAssignUnassignedSubmissionItems,
} from '@/lib/deals/submission-item-display'

describe('submission item display', () => {
  const openHigh = {
    state: 'open' as const,
    confidence: 'high' as const,
    review: null,
  }
  const providedLow = {
    state: 'provided' as const,
    confidence: 'low' as const,
    review: null,
  }
  const dismissed = {
    state: 'open' as const,
    confidence: 'low' as const,
    review: 'dismissed' as const,
  }
  const confirmedLow = {
    state: 'open' as const,
    confidence: 'low' as const,
    review: 'confirmed' as const,
  }

  it('hides dismissed items and counts unreviewed independently of state', () => {
    expect(isVisibleSubmissionItem(dismissed)).toBe(false)
    expect(isUnreviewedSubmissionItem(providedLow)).toBe(true)
    expect(isUnreviewedSubmissionItem(confirmedLow)).toBe(false)
    expect(
      countSubmissionItems([openHigh, providedLow, dismissed, confirmedLow]),
    ).toEqual({ total: 3, open: 2, unreviewed: 1 })
  })

  it('formats the phrase without a readiness claim', () => {
    expect(formatSubmissionItemCounts({ total: 11, open: 5, unreviewed: 3 })).toBe(
      '11 Anlagen · 5 offen · 3 ungeprüft',
    )
    expect(formatSubmissionItemCounts({ total: 1, open: 1, unreviewed: 0 })).toBe(
      '1 Anlage · 1 offen',
    )
  })

  it('cycles state and detects the reference list by title', () => {
    expect(nextSubmissionItemState('open')).toBe('provided')
    expect(nextSubmissionItemState('provided')).toBe('not_applicable')
    expect(nextSubmissionItemState('not_applicable')).toBe('open')
    expect(isReferenceListItem('Referenzliste')).toBe(true)
    expect(isReferenceListItem('Referenzangaben')).toBe(false)
  })

  it('does not write deadline_id when cycling state', () => {
    const patch = cycleSubmissionItemStateFields(
      'open',
      'user-1',
      '2026-08-28T12:00:00.000Z',
    )
    expect(patch).not.toHaveProperty('deadline_id')
    expect(patch.state).toBe('provided')
  })

  it('auto-assigns unassigned items only for a single mutable target', () => {
    expect(
      shouldAutoAssignUnassignedSubmissionItems({ canMutate: true, markedCount: 1 }),
    ).toBe(true)
    expect(
      shouldAutoAssignUnassignedSubmissionItems({ canMutate: true, markedCount: 2 }),
    ).toBe(false)
    expect(
      shouldAutoAssignUnassignedSubmissionItems({ canMutate: false, markedCount: 1 }),
    ).toBe(false)
  })

  it('omits the tile phrase when no Abgabe is marked', () => {
    expect(formatSubmissionWorkspaceTileState([])).toBeNull()
    expect(
      formatSubmissionWorkspaceTileState([
        { items: [{ state: 'open', confidence: 'high', review: null }] },
      ]),
    ).toBe('1 Anlage · 1 offen')
  })
})
