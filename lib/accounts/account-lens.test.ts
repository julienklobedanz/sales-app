import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_LENS_CARE_KEYS,
  ACCOUNT_LENS_SECTIONS,
  accountLensEditableControlIds,
  accountLensHasActionableSignal,
  accountLensLoads,
  accountLensSectionPresence,
  isAccountLensLoadKey,
  salesRepHomeReadsCareTables,
} from './account-lens'

describe('account lens (§10.9)', () => {
  it('lässt nur Identität, Zustand, Beweise, Deals und Signal zu', () => {
    expect([...ACCOUNT_LENS_SECTIONS]).toEqual([
      'identity',
      'state',
      'proofs',
      'deals',
      'signal',
    ])
    for (const care of ACCOUNT_LENS_CARE_KEYS) {
      expect(ACCOUNT_LENS_SECTIONS as readonly string[]).not.toContain(care)
    }
  })

  it('zeigt Identität, Zustand und Beweise immer; Deals und Signal phasenabhängig', () => {
    expect(
      accountLensSectionPresence({ hasDeals: false, hasActionableSignal: false }),
    ).toEqual({
      identity: 'shown',
      state: 'shown',
      proofs: 'shown',
      deals: 'omitted',
      signal: 'omitted',
    })
    expect(
      accountLensSectionPresence({ hasDeals: true, hasActionableSignal: true }),
    ).toEqual({
      identity: 'shown',
      state: 'shown',
      proofs: 'shown',
      deals: 'shown',
      signal: 'shown',
    })
  })

  it('hat keine bearbeitbaren Linsenfelder', () => {
    expect(accountLensEditableControlIds()).toEqual([])
  })

  it('lädt Deals, Referenzen, NDA und handlungsrelevante Signale', () => {
    expect(accountLensLoads('deals')).toBe(true)
    expect(accountLensLoads('references')).toBe(true)
    expect(accountLensLoads('nda')).toBe(true)
    expect(accountLensLoads('actionableSignal')).toBe(true)
    expect(isAccountLensLoadKey('strategy')).toBe(false)
    expect(isAccountLensLoadKey('deals')).toBe(true)
  })

  it('weist Care-Keys auf Typebene ab', () => {
    // @ts-expect-error — Care-Keys sind nicht Teil des Linsen-Typs
    accountLensLoads('strategy')
  })

  it('lässt die Signalzeile ohne Anlass weg', () => {
    expect(
      accountLensHasActionableSignal({
        hasOpenDeals: false,
        latestSignalSummary: 'Wechsel im Vorstand',
      }),
    ).toBe(false)
    expect(
      accountLensHasActionableSignal({
        hasOpenDeals: true,
        latestSignalSummary: '   ',
      }),
    ).toBe(false)
    expect(
      accountLensHasActionableSignal({
        hasOpenDeals: true,
        latestSignalSummary: 'Wechsel im Vorstand',
      }),
    ).toBe(true)
  })

  it('hält die Sales-Rep-Startseite von Pflege-Tabellen fern', () => {
    expect(salesRepHomeReadsCareTables()).toBe(false)
  })
})
