import { describe, expect, it } from 'vitest'

import { COPY } from '@/lib/copy'
import { buildSalesRepQueue } from '@/lib/dashboard-home/build-sales-rep-queue'
import type {
  SalesRepDashboardModel,
  SalesRepDealCard,
} from '@/lib/dashboard-home/dashboard-home-types'

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
            deadline: {
              date: '2026-07-15',
              text: null,
              isApproximate: false,
              origin: 'legacy',
            },
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
            href: '/accounts/c2',
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
            href: '/accounts/c1',
          },
          {
            id: 'i2',
            text: 'Apple liest Supply-Chain-Control-Tower',
            createdAt: new Date().toISOString(),
            href: '/accounts/c1',
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
            deadline: {
              date: '2026-07-15',
              text: null,
              isApproximate: false,
              origin: 'legacy',
            },
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

  it('zeigt due_text ohne Datum unverändert in der Meta-Zeile', () => {
    const queue = buildSalesRepQueue(
      baseModel({
        activeDeals: [
          gapDeal({
            deadline: {
              date: null,
              text: 'September 2026',
              isApproximate: true,
              origin: 'tender',
            },
          }),
        ],
      }),
    )

    expect(queue[0]?.meta).toContain('September 2026')
    expect(queue[0]?.meta).not.toMatch(/\d+\s+(Tag|Tagen|Wo)\b/)
    expect(queue[0]?.meta).not.toContain(COPY.dashboard.home.salesRep.dealOpen)
  })

  it('zeigt ohne Datum und ohne Text die offene-Frist-Copy', () => {
    const queue = buildSalesRepQueue(
      baseModel({
        activeDeals: [
          gapDeal({
            deadline: {
              date: null,
              text: null,
              isApproximate: false,
              origin: 'legacy',
            },
          }),
        ],
      }),
    )

    expect(queue[0]?.meta).toContain(COPY.dashboard.home.salesRep.dealOpen)
  })
})

function gapDeal(overrides: Partial<SalesRepDealCard> = {}): SalesRepDealCard {
  return {
    id: 'd1',
    title: 'ARD 2026',
    status: 'open',
    company_id: 'c1',
    company_name: 'ARD',
    volume: null,
    deadline: {
      date: null,
      text: null,
      isApproximate: false,
      origin: 'legacy',
    },
    linkedCount: 0,
    bestMatchScore: null,
    quickShareReferenceId: null,
    recentSignalCount: 0,
    ...overrides,
  }
}
