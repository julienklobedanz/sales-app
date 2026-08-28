import { describe, expect, it } from 'vitest'

import {
  extractSubmissionItemsByPattern,
  mergeSubmissionItems,
} from '@/lib/deals/extract-submission-items-pattern'
import { parseSubmissionItemsResponse } from '@/lib/deals/submission-items-schema'

const ARD_LIKE = `
Der Teilnahmeantrag besteht nebst Anlagen A1 bis A10 aus folgenden Unterlagen:

Anlage A1 „Bewerbungsbogen“
Anlage A2 „Eigenerklärung zur Eignung“
Anlage A3 „Verpflichtungserklärung“
Anlage A4 „Erklärung zur Insolvenz“
Anlage A5 „Erklärung zur Zuverlässigkeit“
Anlage A6 „Referenzangaben“
Anlage A6a Anhang – Eigenerklärung „Weitere Angaben zum Bewerber“
Anlage A7 „Präqualifikation“
Anlage A8 „Umsatzangaben“
Anlage A9 „Erklärung Nachunternehmer“
Anlage A10 „Datenschutzhinweis“

Die Unterlagen sind erneut aufgeführt:
Anlage A1 „Bewerbungsbogen“
Anlage A6a Anhang – Eigenerklärung „Weitere Angaben zum Bewerber“
`

describe('extractSubmissionItemsByPattern', () => {
  it('reads ARD-like rows including A6a with text between identifier and title', () => {
    const items = extractSubmissionItemsByPattern(ARD_LIKE)
    expect(items.map((row) => row.identifier)).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
      'A6a',
      'A7',
      'A8',
      'A9',
      'A10',
    ])
    expect(items).toHaveLength(11)
    expect(items[0]).toMatchObject({
      identifier: 'A1',
      title: 'Bewerbungsbogen',
      form: 'strict',
    })
    expect(items.find((row) => row.identifier === 'A6a')).toMatchObject({
      title: 'Weitere Angaben zum Bewerber',
      form: 'loose',
    })
  })

  it('matches Anhang, Formblatt and Vordruck with ascii quotes', () => {
    const text = `
Anhang A3 "Lageplan"
Formblatt 221 "Preisblatt"
Vordruck 7 „Vollmacht“
`
    const items = extractSubmissionItemsByPattern(text)
    expect(
      items.map((row) => ({ identifier: row.identifier, title: row.title })),
    ).toEqual([
      { identifier: 'A3', title: 'Lageplan' },
      { identifier: '221', title: 'Preisblatt' },
      { identifier: '7', title: 'Vollmacht' },
    ])
  })

  it('does not treat the A1-bis-A10 header as a position', () => {
    const items = extractSubmissionItemsByPattern(
      'Der Antrag besteht nebst Anlagen A1 bis A10.',
    )
    expect(items).toEqual([])
  })

  it('Gegenprobe: Auftraggeber-Anlagen der Leistungsbeschreibung sind keine Positionen', () => {
    const bimaExcerpt = `
Anlage C-02.1 „Leistungsverzeichnis“
Anlage C-02.2 „Definitionen des Bundesinnungsverbandes des Gebäudereiniger-Handwerkes“
Anlage C-02.3 „Reinigungszeiten und Ansprechpartner“
Anlage C-02.4 „Verschwiegenheitserklärung“
`
    expect(extractSubmissionItemsByPattern(bimaExcerpt)).toEqual([])
    expect(
      mergeSubmissionItems(extractSubmissionItemsByPattern(bimaExcerpt), []),
    ).toEqual([])
  })

  it('nimmt die Bieter-Abgabe und lässt die Auftraggeber-Anlage weg', () => {
    const excerpt = `
Zum Teilnahmeantrag gehört Anlage A9 „Referenzliste“.
Zur Leistungsbeschreibung des Auftraggebers gehört Anlage C-02.3 „Reinigungszeiten und Ansprechpartner“.
`
    expect(extractSubmissionItemsByPattern(excerpt)).toMatchObject([
      { identifier: 'A9', title: 'Referenzliste' },
    ])
  })
})

describe('mergeSubmissionItems', () => {
  it('lets the pattern win and marks overlap as high', () => {
    const merged = mergeSubmissionItems(
      [{ identifier: 'A1', title: 'Bewerbungsbogen', form: 'strict' }],
      [
        { identifier: 'A1', title: 'Bewerbungsbogen (Modell)' },
        { identifier: 'A2', title: 'Eigenerklärung' },
      ],
    )
    expect(merged).toEqual([
      {
        identifier: 'A1',
        title: 'Bewerbungsbogen',
        confidence: 'high',
        matchSource: 'pattern',
      },
      {
        identifier: 'A2',
        title: 'Eigenerklärung',
        confidence: 'low',
        matchSource: 'model',
      },
    ])
  })

  it('marks a loose pattern-only hit as low', () => {
    const merged = mergeSubmissionItems(
      [
        {
          identifier: 'A6a',
          title: 'Weitere Angaben zum Bewerber',
          form: 'loose',
        },
      ],
      [],
    )
    expect(merged).toEqual([
      {
        identifier: 'A6a',
        title: 'Weitere Angaben zum Bewerber',
        confidence: 'low',
        matchSource: 'pattern',
      },
    ])
  })

  it('marks loose A6a high when the model finds the same identifier', () => {
    const merged = mergeSubmissionItems(
      [
        {
          identifier: 'A6a',
          title: 'Weitere Angaben zum Bewerber',
          form: 'loose',
        },
      ],
      [{ identifier: 'A6a', title: 'Eigenerklärung' }],
    )
    expect(merged).toEqual([
      {
        identifier: 'A6a',
        title: 'Weitere Angaben zum Bewerber',
        confidence: 'high',
        matchSource: 'pattern',
      },
    ])
  })

  it('drops contracting-authority annexes even if the model emits them', () => {
    const merged = mergeSubmissionItems(
      [],
      [
        { identifier: 'C-02.3', title: 'Reinigungszeiten und Ansprechpartner' },
        { identifier: 'A9', title: 'Referenzliste' },
      ],
    )
    expect(merged).toEqual([
      {
        identifier: 'A9',
        title: 'Referenzliste',
        confidence: 'low',
        matchSource: 'model',
      },
    ])
  })
})

describe('parseSubmissionItemsResponse', () => {
  it('drops empty titles and caps identifier length', () => {
    const parsed = parseSubmissionItemsResponse({
      items: [
        { identifier: 'A1', title: 'Bewerbungsbogen' },
        { identifier: 'A2', title: '   ' },
        { title: 'Ohne Nummer' },
      ],
    })
    expect(parsed).toEqual([
      { identifier: 'A1', title: 'Bewerbungsbogen' },
      { identifier: null, title: 'Ohne Nummer' },
    ])
  })
})
