import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/lib/routes'
import {
  DEAL_MATCH_PARAM,
  dealMatchHref,
  parseDealMatchOpen,
} from './deal-match-href'

describe('dealMatchHref', () => {
  it('öffnet den Drawer über ?match=1 am Deal', () => {
    expect(dealMatchHref('deal-1')).toBe(`${ROUTES.deals.detail('deal-1')}?match=1`)
  })

  it('liest nur den Wert 1 als offen', () => {
    expect(parseDealMatchOpen(new URLSearchParams('match=1'))).toBe(true)
    expect(parseDealMatchOpen(new URLSearchParams('match=true'))).toBe(false)
    expect(parseDealMatchOpen(new URLSearchParams())).toBe(false)
    expect(DEAL_MATCH_PARAM).toBe('match')
  })
})
