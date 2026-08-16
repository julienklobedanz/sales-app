import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_DETAIL_CARE_SURFACES,
  ACCOUNT_DETAIL_SURFACES,
  accountDetailLoads,
  isAccountDetailCareSurface,
  isAdmittedAccountDetailSurface,
  salesRepHomeReadsCareTables,
} from './account-detail-surfaces'

describe('account detail surfaces (§10.9)', () => {
  it('lässt nur Header, NDA, Pipeline und Proof Points zu', () => {
    expect([...ACCOUNT_DETAIL_SURFACES]).toEqual([
      'header',
      'nda',
      'pipeline',
      'proof_points',
    ])
    expect(isAdmittedAccountDetailSurface('pipeline')).toBe(true)
    expect(isAdmittedAccountDetailSurface('proof_points')).toBe(true)
    expect(isAdmittedAccountDetailSurface('header')).toBe(true)
    expect(isAdmittedAccountDetailSurface('nda')).toBe(true)
  })

  it('weist Strategie und Buying Center als Pflegeflächen ab', () => {
    expect([...ACCOUNT_DETAIL_CARE_SURFACES]).toEqual([
      'mission_control',
      'buying_center',
    ])
    expect(isAdmittedAccountDetailSurface('mission_control')).toBe(false)
    expect(isAdmittedAccountDetailSurface('buying_center')).toBe(false)
    expect(isAccountDetailCareSurface('mission_control')).toBe(true)
    expect(isAccountDetailCareSurface('buying_center')).toBe(true)
    expect(isAccountDetailCareSurface('pipeline')).toBe(false)
  })

  it('lädt keine Care-Daten, wohl aber Deals, Referenzen und NDA', () => {
    expect(accountDetailLoads('strategy')).toBe(false)
    expect(accountDetailLoads('stakeholders')).toBe(false)
    expect(accountDetailLoads('internalContacts')).toBe(false)
    expect(accountDetailLoads('externalContacts')).toBe(false)
    expect(accountDetailLoads('marketSignals')).toBe(false)
    expect(accountDetailLoads('deals')).toBe(true)
    expect(accountDetailLoads('references')).toBe(true)
    expect(accountDetailLoads('nda')).toBe(true)
  })

  it('hält die Sales-Rep-Startseite von Pflege-Tabellen fern', () => {
    expect(salesRepHomeReadsCareTables()).toBe(false)
  })
})
