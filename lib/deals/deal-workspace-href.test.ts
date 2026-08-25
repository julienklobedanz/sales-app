import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/lib/routes'
import {
  DEAL_RFP_HASH_IDS,
  dealWorkspaceAreaHref,
  dealWorkspaceHref,
  dealWorkspaceLandingHref,
  parseDealWorkspaceAreaFromPathname,
  resolveDealRfpHash,
  resolveDealWorkspaceAccess,
} from './deal-workspace-href'

describe('deal workspace href', () => {
  it('legt die Unterroute ohne Hash an', () => {
    expect(dealWorkspaceHref('deal-1')).toBe('/deals/deal-1/ausschreibung')
    expect(dealWorkspaceHref('deal-1')).not.toContain('#')
  })

  it('landet nach Promote auf /dokumente, nicht auf der Deal-Seite', () => {
    expect(dealWorkspaceLandingHref('deal-1')).toBe(
      '/deals/deal-1/ausschreibung/dokumente',
    )
    expect(dealWorkspaceLandingHref('deal-1')).not.toBe(dealWorkspaceHref('deal-1'))
    expect(dealWorkspaceLandingHref('deal-1')).not.toBe(ROUTES.deals.detail('deal-1'))
  })
})

describe('ROUTES.deals.detailRfp', () => {
  it('zeigt auf die Unterroute ohne Hash', () => {
    expect(ROUTES.deals.detailRfp('deal-1')).toBe(dealWorkspaceHref('deal-1'))
    expect(ROUTES.deals.detailRfp('deal-1')).not.toContain('#')
    expect(ROUTES.deals.workspace('deal-1')).toBe(dealWorkspaceHref('deal-1'))
  })
})

describe('resolveDealWorkspaceAccess', () => {
  it('unbekannte ID → not-found', () => {
    expect(resolveDealWorkspaceAccess(null)).toEqual({ kind: 'not-found' })
  })

  it('ohne RFP-Modus → Redirect auf die Deal-Seite', () => {
    expect(resolveDealWorkspaceAccess({ id: 'deal-1', is_rfp_mode: false })).toEqual({
      kind: 'redirect-deal',
      href: ROUTES.deals.detail('deal-1'),
    })
  })

  it('RFP-Modus → ok', () => {
    expect(resolveDealWorkspaceAccess({ id: 'deal-1', is_rfp_mode: true })).toEqual({
      kind: 'ok',
    })
  })
})

describe('parseDealWorkspaceAreaFromPathname', () => {
  it('liest den Bereich aus der Unterroute', () => {
    expect(
      parseDealWorkspaceAreaFromPathname('/deals/deal-1/ausschreibung/entwuerfe'),
    ).toBe('entwuerfe')
    expect(parseDealWorkspaceAreaFromPathname('/deals/deal-1/ausschreibung')).toBeNull()
    expect(parseDealWorkspaceAreaFromPathname('/deals/deal-1')).toBeNull()
  })
})

describe('resolveDealRfpHash', () => {
  it('kennt die sechs Anker plus ausschreibung und notice-hero', () => {
    expect([...DEAL_RFP_HASH_IDS]).toEqual([
      'urteil',
      'stammdaten',
      'eligCard',
      'risks',
      'drafts',
      'dokumente',
      'ausschreibung',
      'notice-hero',
    ])
  })

  it('schickt Urteil von der Unterroute auf die Deal-Seite', () => {
    expect(
      resolveDealRfpHash({
        hash: '#urteil',
        isRfpDeal: true,
        current: 'workspace',
        currentArea: 'dokumente',
        dealId: 'deal-1',
      }),
    ).toEqual({ href: `${ROUTES.deals.detail('deal-1')}#urteil` })
  })

  it.each([
    ['stammdaten', 'stammdaten'],
    ['eligCard', 'eignung'],
    ['risks', 'risiken'],
    ['drafts', 'entwuerfe'],
    ['dokumente', 'dokumente'],
  ] as const)('schickt #%s von der Deal-Seite auf /%s', (hash, area) => {
    expect(
      resolveDealRfpHash({
        hash: `#${hash}`,
        isRfpDeal: true,
        current: 'deal-page',
        dealId: 'deal-1',
      }),
    ).toEqual({ href: dealWorkspaceAreaHref('deal-1', area) })
  })

  it('schickt #ausschreibung auf den Default-Bereich', () => {
    expect(
      resolveDealRfpHash({
        hash: '#ausschreibung',
        isRfpDeal: true,
        current: 'deal-page',
        dealId: 'deal-1',
      }),
    ).toEqual({ href: dealWorkspaceLandingHref('deal-1') })
  })

  it('schickt #notice-hero auf den Steckbrief', () => {
    expect(
      resolveDealRfpHash({
        hash: '#notice-hero',
        isRfpDeal: true,
        current: 'deal-page',
        dealId: 'deal-1',
      }),
    ).toEqual({ href: dealWorkspaceAreaHref('deal-1', 'steckbrief') })
  })

  it('bleibt ohne RFP-Modus auf der Deal-Seite — keine Schleife', () => {
    expect(
      resolveDealRfpHash({
        hash: '#drafts',
        isRfpDeal: false,
        current: 'deal-page',
        dealId: 'deal-1',
      }),
    ).toBeNull()
  })

  it('ändert nichts, wenn der Bereich schon stimmt', () => {
    expect(
      resolveDealRfpHash({
        hash: '#drafts',
        isRfpDeal: true,
        current: 'workspace',
        currentArea: 'entwuerfe',
        dealId: 'deal-1',
      }),
    ).toBeNull()
    expect(
      resolveDealRfpHash({
        hash: '#urteil',
        isRfpDeal: true,
        current: 'deal-page',
        dealId: 'deal-1',
      }),
    ).toBeNull()
  })

  it('wechselt den Bereich, wenn der Anker auf eine andere Fläche zeigt', () => {
    expect(
      resolveDealRfpHash({
        hash: '#drafts',
        isRfpDeal: true,
        current: 'workspace',
        currentArea: 'dokumente',
        dealId: 'deal-1',
      }),
    ).toEqual({ href: dealWorkspaceAreaHref('deal-1', 'entwuerfe') })
  })
})
