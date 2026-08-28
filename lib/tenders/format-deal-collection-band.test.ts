import { describe, expect, it } from 'vitest'

import { EMPTY_RESOLVED_DEADLINE } from '@/lib/deals/resolve-deal-deadline'

import { formatDealCollectionBandLabel } from './format-deal-collection-band'

describe('formatDealCollectionBandLabel', () => {
  const now = new Date('2026-08-28T12:00:00.000Z')

  it('verbindet gesetzte Teile mit Malpunkten und lässt Leeres weg', () => {
    expect(
      formatDealCollectionBandLabel(
        {
          title: 'BMI 2026',
          companyName: 'BMI',
          nextDeadline: {
            date: '2026-09-01',
            text: null,
            isApproximate: false,
            origin: 'tender',
          },
          derivedStatusLabel: 'läuft · 1 von 2 gewonnen',
        },
        now,
      ),
    ).toBe('BMI 2026 · BMI · in 4 Tagen · läuft · 1 von 2 gewonnen')
  })

  it('zeigt due_text ohne Datum', () => {
    expect(
      formatDealCollectionBandLabel({
        title: 'BMI 2026',
        companyName: null,
        nextDeadline: {
          date: null,
          text: 'September 2026',
          isApproximate: true,
          origin: 'tender',
        },
        derivedStatusLabel: '—',
      }),
    ).toBe('BMI 2026 · September 2026')
  })

  it('lässt Status-Platzhalter und fehlende Felder weg', () => {
    expect(
      formatDealCollectionBandLabel({
        title: 'Nur Titel',
        companyName: null,
        nextDeadline: EMPTY_RESOLVED_DEADLINE,
        derivedStatusLabel: '—',
      }),
    ).toBe('Nur Titel')
  })
})
