import { describe, expect, it } from 'vitest'

import { buildDealFactRows } from '@/lib/deals/deal-facts-rows'
import { COPY } from '@/lib/copy'

describe('buildDealFactRows', () => {
  const base = {
    company_name: 'Apple',
    industry: 'tech',
    volume: '1.200.000 €',
    expiry_date: '2026-04-18',
    account_manager_name: 'Marc AM',
    sales_manager_name: 'Sam Sales',
  }

  it('formats close date with org preset', () => {
    const rows = buildDealFactRows(base, { dateDisplayFormat: 'de-DE' })
    const close = rows.find((r) => r.label === 'Close')
    expect(close?.kind).toBe('text')
    if (close?.kind === 'text') expect(close.value).toBe('18.04.2026')
  })

  it('omits identity fields that live in the header', () => {
    const rows = buildDealFactRows(base)
    expect(rows.some((r) => r.label === 'Account')).toBe(false)
    expect(rows.some((r) => r.label === 'Volumen')).toBe(false)
  })

  it('omits empty placeholder rows', () => {
    const rows = buildDealFactRows({
      company_name: 'Apple',
      industry: null,
      volume: null,
      expiry_date: null,
      account_manager_name: null,
      sales_manager_name: 'Sam Sales',
    })
    expect(rows.map((r) => r.label)).toEqual([COPY.roles.salesManager])
  })
})
