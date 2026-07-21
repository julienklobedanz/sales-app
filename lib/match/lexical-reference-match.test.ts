import { describe, expect, it } from 'vitest'

import {
  enrichEmbedQueryForExactCompany,
  escapeIlikePattern,
  LEXICAL_SCORE_COMPANY_CONTAINS,
  LEXICAL_SCORE_EXACT_COMPANY,
  LEXICAL_SCORE_SUMMARY_CONTAINS,
  LEXICAL_SCORE_TITLE_CONTAINS,
  lexicalSearchNeedles,
  mergeMatchHitsByMaxSimilarity,
  scoreLexicalReferenceMatch,
  textContainsNeedle,
} from './lexical-reference-match'

describe('textContainsNeedle', () => {
  it('matches title substrings and hyphenated compounds', () => {
    expect(textContainsNeedle('Passagierfluss-Analyse am Drehkreuz', 'passagier')).toBe(true)
    expect(
      textContainsNeedle('Passagierfluss-Analyse am Drehkreuz', 'passagierflussanalyse')
    ).toBe(true)
  })
})

describe('lexicalSearchNeedles', () => {
  it('includes tokens for short queries', () => {
    expect(lexicalSearchNeedles('passagier')).toContain('passagier')
    expect(lexicalSearchNeedles('zeig mir passagier')).toEqual(
      expect.arrayContaining(['zeig mir passagier', 'passagier'])
    )
  })
})

describe('scoreLexicalReferenceMatch', () => {
  it('scores exact company name highly', () => {
    expect(scoreLexicalReferenceMatch('Arla', 'Arla', 'Hybride Cloud')).toBe(
      LEXICAL_SCORE_EXACT_COMPANY
    )
  })

  it('scores company contains', () => {
    expect(scoreLexicalReferenceMatch('BMW', 'BMW Group', 'Connected Drive')).toBe(
      LEXICAL_SCORE_COMPANY_CONTAINS
    )
  })

  it('scores title substring for Teilbegriff', () => {
    expect(
      scoreLexicalReferenceMatch(
        'passagier',
        'Fraport',
        'Passagierfluss-Analyse am Drehkreuz-Flughafen'
      )
    ).toBe(LEXICAL_SCORE_TITLE_CONTAINS)
  })

  it('scores summary contains', () => {
    expect(
      scoreLexicalReferenceMatch('wartezeit', 'Fraport', 'Anderer Titel', 'Security-Wartezeit P95')
    ).toBe(LEXICAL_SCORE_SUMMARY_CONTAINS)
  })

  it('returns null for unrelated query', () => {
    expect(scoreLexicalReferenceMatch('Finanzdienstleister 5 Mio', 'Arla', 'Milch')).toBeNull()
  })

  it('ignores tiny needles', () => {
    expect(scoreLexicalReferenceMatch('a', 'Arla', 'x')).toBeNull()
  })
})

describe('escapeIlikePattern', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeIlikePattern('100%_off')).toBe('100\\%\\_off')
  })
})

describe('enrichEmbedQueryForExactCompany', () => {
  it('prefixes Kunde/Account for exact brand query', () => {
    expect(enrichEmbedQueryForExactCompany('Arla', ['Arla', 'BMW'])).toBe(
      'Kunde/Account: Arla\nArla'
    )
  })

  it('leaves content queries unchanged', () => {
    expect(enrichEmbedQueryForExactCompany('cloud', ['Arla'])).toBe('cloud')
  })
})

describe('mergeMatchHitsByMaxSimilarity', () => {
  it('keeps higher similarity and unions ids', () => {
    const merged = mergeMatchHitsByMaxSimilarity(
      [
        { id: 'a', similarity: 0.4 },
        { id: 'b', similarity: 0.5 },
      ],
      [
        { id: 'a', similarity: 0.78 },
        { id: 'c', similarity: 0.6 },
      ]
    )
    expect(merged.find((m) => m.id === 'a')?.similarity).toBe(0.78)
    expect(merged.map((m) => m.id).sort()).toEqual(['a', 'b', 'c'])
  })
})
