import { describe, expect, it } from 'vitest'

import {
  buildHeuristicOutreachDraft,
  formatOutreachEmail,
  normalizeOutreachDraftText,
} from './outreach-draft'

describe('formatOutreachEmail', () => {
  it('uses one blank line after greeting and two before closing', () => {
    const text = formatOutreachEmail({
      greeting: 'Guten Tag Herr Meier,',
      body: 'Erster Absatz.\n\nZweiter Absatz.',
      closing: 'Vielen Dank im Voraus und beste Grüße,',
      senderFullName: 'Anna Schmidt',
    })
    expect(text).toBe(
      'Guten Tag Herr Meier,\n\nErster Absatz.\n\nZweiter Absatz.\n\n\nVielen Dank im Voraus und beste Grüße,\nAnna Schmidt'
    )
  })
})

describe('buildHeuristicOutreachDraft', () => {
  it('includes signal headline context and sender name without forcing reference titles', () => {
    const draft = buildHeuristicOutreachDraft({
      headline: 'Neuer CIO bei Acme',
      signalKind: 'exec',
      companyName: 'Acme GmbH',
      introTone: 'advisory',
      summarySnippet: 'Wechsel im IT-Führungsteam.',
      referenceTitles: ['Cloud Migration Retail'],
      recipientFullName: 'Lena Hoffmann',
      senderFullName: 'Max Mustermann',
    })
    expect(draft).toContain('Guten Tag Herr/Frau Hoffmann,')
    expect(draft).toContain('Neuer CIO bei Acme')
    expect(draft).not.toContain('Cloud Migration Retail')
    expect(draft.endsWith('Max Mustermann')).toBe(true)
    expect(draft.split('\n\n\n').length).toBeGreaterThanOrEqual(2)
  })
})

describe('normalizeOutreachDraftText', () => {
  it('reformats loose LLM output', () => {
    const raw = `Hallo Frau Test,
Body line one.

Vielen Dank und beste Grüße
Jane Doe`
    const normalized = normalizeOutreachDraftText(raw, {
      headline: 'x',
      signalKind: 'news',
      companyName: 'Co',
      introTone: 'concise',
      summarySnippet: 'y',
      referenceTitles: [],
      senderFullName: 'Jane Doe',
    })
    expect(normalized).toContain('Hallo Frau Test,')
    expect(normalized).toContain('Body line one.')
    expect(normalized).toContain('Jane Doe')
  })
})
