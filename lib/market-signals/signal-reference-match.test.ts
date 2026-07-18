import { describe, expect, it } from 'vitest'

import {
  buildSignalMatchQuery,
  composeOutreachWithProofBlocks,
  formatReferenceProofBlock,
  matchingReferencesLabel,
} from './signal-reference-match'

describe('buildSignalMatchQuery', () => {
  it('baut Query aus Headline und Kontext', () => {
    const q = buildSignalMatchQuery({
      headline: 'Neuer CIO bei Müller',
      compellingEvent: 'Fokus auf Cloud-Migration.',
      companyName: 'Müller GmbH',
    })
    expect(q).toContain('Neuer CIO')
    expect(q).toContain('Cloud-Migration')
    expect(q).toContain('Müller GmbH')
  })
})

describe('formatReferenceProofBlock', () => {
  it('formatiert kurzen Proof-Satz', () => {
    const block = formatReferenceProofBlock({
      id: '1',
      title: 'Cloud-Migration Schmidt',
      snippet: 'Migration von SAP-Workloads in 9 Monaten.',
      companyName: 'Schmidt AG',
      similarity: 0.5,
    })
    expect(block).toContain('Cloud-Migration Schmidt')
    expect(block).toContain('Schmidt AG')
    expect(block).toContain('SAP-Workloads')
  })
})

describe('composeOutreachWithProofBlocks', () => {
  it('fügt Blöcke vor dem Abschluss ein und lässt Base intakt', () => {
    const base =
      'Guten Tag Herr Müller,\n\nKurz zum Signal.\n\n\nVielen Dank im Voraus und beste Grüße,\nAnna'
    const once = composeOutreachWithProofBlocks(base, ['Ähnliche Situation: „Case A".'])
    expect(once).toContain('Kurz zum Signal.')
    expect(once).toContain('Ähnliche Situation: „Case A".')
    expect(once).toContain('Vielen Dank im Voraus')

    const twice = composeOutreachWithProofBlocks(base, [
      'Ähnliche Situation: „Case A".',
      'Ähnliche Situation: „Case B".',
    ])
    expect(twice).toContain('Case A')
    expect(twice).toContain('Case B')

    const none = composeOutreachWithProofBlocks(base, [])
    expect(none).toBe(base.replace(/\s+$/u, ''))
  })
})

describe('matchingReferencesLabel', () => {
  it('singular/plural', () => {
    expect(matchingReferencesLabel(1)).toBe('1 passende Referenz')
    expect(matchingReferencesLabel(2)).toBe('2 passende Referenzen')
  })
})
