import { describe, expect, it } from 'vitest'

import { resolveAccountCardPrimaryAction } from './account-card-primary-action'

const now = new Date('2026-07-15T12:00:00Z')

describe('resolveAccountCardPrimaryAction', () => {
  it('prioritizes approval expiry over contract', () => {
    const action = resolveAccountCardPrimaryAction({
      accountStatus: 'at_risk',
      nextApproval: { title: 'Cloud Migration', expiresAt: '2026-07-25' },
      nextContract: { title: 'Managed Service', contractEndDate: '2026-12-01' },
      nextNdaExpiry: null,
      ndaStatus: 'active',
      latestSignalSummary: 'Neuer CIO',
      openDealsCount: 1,
      referenceCount: 2,
      now,
    })
    expect(action.kind).toBe('approval')
    expect(action.label).toContain('Cloud Migration')
    expect(action.tone).toBe('danger')
  })

  it('shows contract renewal within 9 months with amber beyond 180 days', () => {
    const action = resolveAccountCardPrimaryAction({
      accountStatus: 'at_risk',
      nextApproval: null,
      nextContract: { title: 'Managed Service', contractEndDate: '2027-03-15' },
      nextNdaExpiry: null,
      ndaStatus: 'active',
      latestSignalSummary: null,
      openDealsCount: 0,
      referenceCount: 4,
      now,
    })
    expect(action.kind).toBe('contract')
    expect(action.label).toContain('Managed Service')
    expect(action.label).toMatch(/Monaten|Monat/)
    expect(action.tone).toBe('warning')
  })

  it('uses danger tone for contract end within 180 days', () => {
    const action = resolveAccountCardPrimaryAction({
      accountStatus: 'at_risk',
      nextApproval: null,
      nextContract: { title: 'Managed Service', contractEndDate: '2026-10-01' },
      nextNdaExpiry: null,
      ndaStatus: 'none',
      latestSignalSummary: null,
      openDealsCount: 0,
      referenceCount: 0,
      now,
    })
    expect(action.kind).toBe('contract')
    expect(action.tone).toBe('danger')
  })

  it('falls back to signal for target', () => {
    const action = resolveAccountCardPrimaryAction({
      accountStatus: 'target',
      nextApproval: null,
      nextContract: null,
      nextNdaExpiry: null,
      ndaStatus: 'none',
      latestSignalSummary: 'Neuer VP Sales DACH',
      openDealsCount: 0,
      referenceCount: 2,
      now,
    })
    expect(action.kind).toBe('signal')
    expect(action.label).toBe('Signal: Neuer VP Sales DACH')
    expect(action.tone).toBe('opportunity')
  })

  it('uses idle fallback for target without signal', () => {
    const action = resolveAccountCardPrimaryAction({
      accountStatus: 'target',
      nextApproval: null,
      nextContract: null,
      nextNdaExpiry: null,
      ndaStatus: 'none',
      latestSignalSummary: null,
      openDealsCount: 0,
      referenceCount: 3,
      now,
    })
    expect(action.kind).toBe('fallback')
    expect(action.label).toBe('Noch kein offener Deal')
  })

  it('ignores contract end outside 9 month window', () => {
    const action = resolveAccountCardPrimaryAction({
      accountStatus: 'active_customer',
      nextApproval: null,
      nextContract: { title: 'Managed Service', contractEndDate: '2027-08-01' },
      nextNdaExpiry: null,
      ndaStatus: 'active',
      latestSignalSummary: null,
      openDealsCount: 1,
      referenceCount: 4,
      now,
    })
    expect(action.kind).toBe('fallback')
    expect(action.label).toContain('1 Deal')
  })
})
