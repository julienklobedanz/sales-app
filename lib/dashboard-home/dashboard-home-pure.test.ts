import { describe, expect, it } from 'vitest'

import { COPY } from '@/lib/copy'

import {
  computeWinRateMetrics,
  countDueMarketSnoozes,
  dashboardFirstName,
  integrationConnectionStatus,
  meddpiccAccountAction,
  teamActivityLabelForEvent,
} from '@/lib/dashboard-home/dashboard-home-pure'

describe('dashboardFirstName', () => {
  it('returns first token or empty', () => {
    expect(dashboardFirstName('Anna Müller')).toBe('Anna')
    expect(dashboardFirstName('  ')).toBe('')
    expect(dashboardFirstName(null)).toBe('')
  })
})

describe('computeWinRateMetrics', () => {
  it('hides percent below minimum closed deals', () => {
    expect(computeWinRateMetrics(2, 1, 3)).toEqual({
      available: false,
      percent: null,
      closedDealsCount: 2,
    })
  })

  it('computes rounded win rate when enough deals', () => {
    expect(computeWinRateMetrics(4, 3, 3)).toEqual({
      available: true,
      percent: 75,
      closedDealsCount: 4,
    })
  })
})

describe('countDueMarketSnoozes', () => {
  it('counts only due market snooze keys (parts[2] date, length >= 4)', () => {
    const now = Date.parse('2026-06-18T12:00:00.000Z')
    const keys = [
      'market_snooze_until:x:2026-06-17:signal-a',
      'market_snooze_until:x:2099-01-01:signal-b',
      'other:key',
      'market_snooze_until:short',
    ]
    expect(countDueMarketSnoozes(keys, now)).toBe(1)
  })
})

describe('meddpiccAccountAction', () => {
  it('prioritizes economic buyer then champion then goals', () => {
    expect(
      meddpiccAccountAction({ hasChampion: true, hasEconomic: false, hasGoals: true })
        .actionLabel,
    ).toBe(COPY.dashboard.home.salesRep.meddpiccFixEconomic)
    expect(
      meddpiccAccountAction({ hasChampion: false, hasEconomic: true, hasGoals: true })
        .meddpiccGap,
    ).toContain('Champion')
    expect(
      meddpiccAccountAction({ hasChampion: true, hasEconomic: true, hasGoals: false })
        .meddpiccGap,
    ).toContain('Metrics')
    expect(
      meddpiccAccountAction({ hasChampion: true, hasEconomic: true, hasGoals: true })
        .actionLabel,
    ).toBe('Send')
  })
})

describe('integrationConnectionStatus', () => {
  it('maps known values', () => {
    expect(integrationConnectionStatus(true)).toBe('healthy')
    expect(integrationConnectionStatus('connected')).toBe('healthy')
    expect(integrationConnectionStatus('error')).toBe('down')
    expect(integrationConnectionStatus('pending')).toBe('warning')
  })
})

describe('teamActivityLabelForEvent', () => {
  it('returns German labels for known events', () => {
    expect(teamActivityLabelForEvent('reference_shared')).toContain('Share-Link')
    expect(teamActivityLabelForEvent('reference_matched')).toContain('Match')
    expect(teamActivityLabelForEvent('unknown')).toContain('Event')
  })
})
