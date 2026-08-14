import { describe, expect, it } from 'vitest'

import { buildSalesRepQueue } from '@/lib/dashboard-home/build-sales-rep-queue'
import type { SalesRepDashboardModel } from '@/lib/dashboard-home/dashboard-home-types'

function baseModel(
  overrides: Partial<SalesRepDashboardModel> = {},
): SalesRepDashboardModel {
  return {
    greetingName: 'Lisa',
    activeDeals: [],
    recentShares: [],
    snoozedSignalsCount: 0,
    dueSnoozesCount: 0,
    liveIntent: [],
    strategicAccounts: [],
    footerStats: { matches7d: 0, shares7d: 0, dealsWithProof: 0, dealsTotal: 0 },
    ...overrides,
  }
}

describe('buildSalesRepQueue', () => {
  it('priorisiert Deals ohne Beweis vor Intent-Signalen', () => {
    const queue = buildSalesRepQueue(
      baseModel({
        activeDeals: [
          {
            id: 'd1',
            title: 'Beta AG',
            status: 'open',
            company_id: 'c1',
            company_name: 'Beta AG',
            volume: '0,9 Mio',
            expiry_date: '2026-07-15',
            linkedCount: 0,
            bestMatchScore: null,
            quickShareReferenceId: null,
            recentSignalCount: 0,
          },
        ],
        liveIntent: [
          {
            id: 'i1',
            text: 'Prospect hat Link geöffnet',
            createdAt: new Date().toISOString(),
            href: '/dashboard/accounts/c2',
          },
        ],
      }),
    )

    expect(queue[0]?.tone).toBe('gap')
    expect(queue[0]?.title).toContain('kein Beweis')
    expect(queue.some((q) => q.tone === 'intent')).toBe(true)
  })

  it('fügt Snooze-Backlog hinzu', () => {
    const queue = buildSalesRepQueue(baseModel({ dueSnoozesCount: 2 }))
    expect(queue.some((q) => q.title.includes('Snooze'))).toBe(true)
  })

  it('dedupliziert gleiche Intent-Einträge', () => {
    const queue = buildSalesRepQueue(
      baseModel({
        liveIntent: [
          {
            id: 'i1',
            text: 'Apple liest Supply-Chain-Control-Tower',
            createdAt: new Date().toISOString(),
            href: '/dashboard/accounts/c1',
          },
          {
            id: 'i2',
            text: 'Apple liest Supply-Chain-Control-Tower',
            createdAt: new Date().toISOString(),
            href: '/dashboard/accounts/c1',
          },
        ],
      }),
    )

    expect(queue.filter((q) => q.tone === 'intent')).toHaveLength(1)
    expect(new Set(queue.map((q) => q.id)).size).toBe(queue.length)
  })

  it('formatiert Deal-Volumen in der Warn-Zeile', () => {
    const queue = buildSalesRepQueue(
      baseModel({
        activeDeals: [
          {
            id: 'd1',
            title: 'Beta AG',
            status: 'open',
            company_id: 'c1',
            company_name: 'Beta AG',
            volume: '1200000',
            expiry_date: '2026-07-15',
            linkedCount: 1,
            bestMatchScore: 0.3,
            quickShareReferenceId: null,
            recentSignalCount: 0,
          },
        ],
      }),
    )

    expect(queue[0]?.meta).toContain('1.200.000 €')
    expect(queue[0]?.meta).not.toContain('1200000')
  })
})
