import { describe, expect, it } from 'vitest'

import { buildDealAusschreibungSummary } from './deal-ausschreibung-summary'

describe('buildDealAusschreibungSummary', () => {
  it('zeigt Dokumentzahl ohne Analyse und lässt die übrigen Werte leer', () => {
    expect(buildDealAusschreibungSummary({ documentCount: 2, data: null })).toEqual({
      eligibility: '—',
      drafts: '—',
      risks: '—',
      documents: '2',
      hasAnalysis: false,
    })
  })

  it('übernimmt Eignung, Entwürfe und Risiken aus der Analyse', () => {
    expect(
      buildDealAusschreibungSummary({
        documentCount: 3,
        data: {
          hasAnalysis: true,
          isStale: false,
          eligibilityAssessment: {
            verdict: 'ko',
            summary: '',
            criteria: [],
          },
          draftRows: [
            { reference: { id: 'r1' }, answer: 'Antwort' },
            { reference: { id: 'r2' } },
            { reference: null },
            {},
          ],
          risks: { redFlags: [{}], smeOpenCount: 2 },
        },
      }),
    ).toEqual({
      eligibility: 'K.O.',
      drafts: '1/4',
      risks: '1',
      documents: '3',
      hasAnalysis: true,
    })
  })
})
