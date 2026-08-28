import { describe, expect, it } from 'vitest'

import { formatDealCollectionBandLabel } from './format-deal-collection-band'

describe('formatDealCollectionBandLabel', () => {
  const now = new Date('2026-08-28T12:00:00.000Z')

  it('verbindet gesetzte Teile mit Malpunkten und lässt Leeres weg', () => {
    expect(
      formatDealCollectionBandLabel(
        {
          title: 'BMI 2026',
          companyName: 'BMI',
          nextDeadline: '2026-09-01',
          derivedStatusLabel: 'läuft · 1 von 2 gewonnen',
        },
        now,
      ),
    ).toBe('BMI 2026 · BMI · in 4 Tagen · läuft · 1 von 2 gewonnen')
  })

  it('lässt Status-Platzhalter und fehlende Felder weg', () => {
    expect(
      formatDealCollectionBandLabel({
        title: 'Nur Titel',
        companyName: null,
        nextDeadline: null,
        derivedStatusLabel: '—',
      }),
    ).toBe('Nur Titel')
  })
})
