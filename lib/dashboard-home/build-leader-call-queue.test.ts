import { describe, expect, it } from 'vitest'

import {
  extractSignalKeyFromSnoozeNotification,
  isMarketSignalSnoozed,
  parseMarketSnoozeUntilMs,
} from '@/lib/dashboard-home/market-signal-inbox-keys'
import {
  scoreCallCandidate,
  type LeaderCallSignalCandidate,
} from '@/lib/dashboard-home/build-leader-call-queue'

describe('market-signal-inbox-keys', () => {
  it('parses snooze until timestamp', () => {
    const key = 'market_snooze_until:2026-08-01T12:00:00.000Z:market_exec:abc'
    expect(parseMarketSnoozeUntilMs(key)).toBe(
      new Date('2026-08-01T12:00:00.000Z').getTime(),
    )
    expect(extractSignalKeyFromSnoozeNotification(key)).toBe('market_exec:abc')
  })

  it('detects active snooze', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const keys = [`market_snooze_until:${future}:market_news:1`]
    expect(isMarketSignalSnoozed(keys, 'market_news:1', Date.now())).toBe(true)
    expect(isMarketSignalSnoozed(keys, 'market_news:2', Date.now())).toBe(false)
  })
})

describe('scoreCallCandidate', () => {
  const baseCandidate: LeaderCallSignalCandidate = {
    signalKey: 'market_exec:1',
    kind: 'exec',
    companyId: 'c1',
    companyName: 'Acme',
    companyLogoUrl: null,
    personName: 'Pat CIO',
    signalFact: 'CIO gewechselt',
    whyNowRaw: null,
    detectedAtMs: Date.now() - 2 * 86400000,
    onChampionWatchlist: true,
    onAccountWatchlist: false,
    signalCategory: 'people',
  }

  it('scores champion + no proof higher', () => {
    const deal = {
      dealId: 'd1',
      dealTitle: 'Deal',
      linkedCount: 0,
      bestMatchScore: null,
      expiryDate: null,
    }
    const withMatch = scoreCallCandidate(
      baseCandidate,
      deal,
      {
        referenceId: 'r1',
        referenceTitle: 'Ref',
        similarity: 0.55,
        personMatchHint: true,
      },
      Date.now(),
    )
    const without = scoreCallCandidate(baseCandidate, deal, null, Date.now())
    expect(withMatch).toBeGreaterThan(without)
  })
})
