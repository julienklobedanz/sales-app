import { describe, expect, it } from 'vitest'

import type { DealDeskTimelineItem } from '@/lib/deal-desk/deal-analysis-types'
import { mapTimelineToRfpDeadlineRows } from '@/lib/deals/deadline-rfp-mapper'
import {
  buildRfpDeadlineSourceKey,
  inferDeadlineKindFromTitle,
  normalizeDeadlineLabel,
} from '@/lib/deals/deadline-source-key'

describe('deadline source_key (Phase 3)', () => {
  const dealId = 'deal-abc-123'

  it('canonical kinds hash only dealId + kind — stable across LLM ids', () => {
    const k1 = buildRfpDeadlineSourceKey(dealId, 'submission')
    const k2 = buildRfpDeadlineSourceKey(dealId, 'submission')
    expect(k1).toBe(k2)
    expect(k1).toHaveLength(32)
  })

  it('custom kinds include normalized label', () => {
    const a = buildRfpDeadlineSourceKey(dealId, 'custom', 'Workshop Tag 1')
    const b = buildRfpDeadlineSourceKey(dealId, 'custom', '  workshop   tag 1 ')
    expect(a).toBe(b)
  })

  it('different labels produce different keys for custom', () => {
    const a = buildRfpDeadlineSourceKey(dealId, 'custom', 'Workshop A')
    const b = buildRfpDeadlineSourceKey(dealId, 'custom', 'Workshop B')
    expect(a).not.toBe(b)
  })

  it('normalizeDeadlineLabel strips diacritics and punctuation', () => {
    expect(normalizeDeadlineLabel('Q&A — Rückfragen')).toBe('q a ruckfragen')
  })

  it('inferDeadlineKindFromTitle maps known patterns', () => {
    expect(inferDeadlineKindFromTitle('Angebotsabgabe')).toBe('submission')
    expect(inferDeadlineKindFromTitle('Q&A / Rückfragenfrist')).toBe('questions')
    expect(inferDeadlineKindFromTitle('Vergabe / Bekanntmachung')).toBe('award_expected')
  })
})

describe('timeline → RFP deadline rows (re-analyse stability)', () => {
  const dealId = 'deal-xyz'

  it('same semantic timeline produces same source_key despite new LLM ids', () => {
    const run1: DealDeskTimelineItem[] = [
      {
        id: 'llm-id-run-1',
        title: 'Angebotsabgabe',
        dueDate: '2026-06-20',
        dueTime: '13:00',
        evidence: null,
      },
    ]
    const run2: DealDeskTimelineItem[] = [
      {
        id: 'llm-id-run-2-completely-different',
        title: 'Angebotsabgabe',
        dueDate: '2026-06-25',
        dueTime: '13:00',
        evidence: null,
      },
    ]

    const rows1 = mapTimelineToRfpDeadlineRows(dealId, run1)
    const rows2 = mapTimelineToRfpDeadlineRows(dealId, run2)

    expect(rows1).toHaveLength(1)
    expect(rows2).toHaveLength(1)
    expect(rows1[0]!.source_key).toBe(rows2[0]!.source_key)
    expect(rows2[0]!.due_at).toContain('2026-06-25')
  })

  it('dedupes duplicate source_keys within one run', () => {
    const items: DealDeskTimelineItem[] = [
      { id: 'a', title: 'Angebotsabgabe', dueDate: '2026-06-20', evidence: null },
      { id: 'b', title: 'Angebotsabgabe', dueDate: '2026-06-21', evidence: null },
    ]
    expect(mapTimelineToRfpDeadlineRows(dealId, items)).toHaveLength(1)
  })
})
