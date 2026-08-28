import { describe, expect, it } from 'vitest'

import type { DealRow } from '@/app/(app)/deals/types'
import { resolvedFromExpiry } from '@/lib/deals/resolve-deal-deadline'
import { ROUTES } from '@/lib/routes'

import { groupDealsForCollection } from './group-deals-for-collection'

function deal(partial: Partial<DealRow> & Pick<DealRow, 'id' | 'title'>): DealRow {
  const expiry_date = partial.expiry_date ?? null
  return {
    company_id: null,
    company_name: null,
    industry: null,
    volume: null,
    incumbent_provider: null,
    is_public: true,
    account_manager_id: null,
    account_manager_name: null,
    sales_manager_id: null,
    sales_manager_name: null,
    status: 'open',
    is_rfp_mode: false,
    tender_id: null,
    tender: null,
    expiry_date,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    best_match_score: null,
    linked_refs: [],
    ...partial,
    deadline: partial.deadline ?? resolvedFromExpiry(partial.expiry_date ?? expiry_date),
  }
}

const tenderA = {
  id: 't-a',
  title: 'BMI 2026',
  company_id: 'co-1',
  company_name: 'BMI',
  company_logo_url: null,
  procedure_type: 'open' as string | null,
  reference_number: null,
  total_volume: '34 Mio. €',
}

describe('groupDealsForCollection', () => {
  it('lässt Deals ohne tender_id flach', () => {
    const rows = groupDealsForCollection([
      deal({ id: 'd1', title: 'Allein', expiry_date: '2026-09-01' }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.rowKind).toBe('lot')
    expect(rows[0]?.href).toBe(ROUTES.deals.detail('d1'))
  })

  it('lässt ein einzelnes Los flach und klickt auf das Los', () => {
    const rows = groupDealsForCollection([
      deal({
        id: 'd1',
        title: 'Los 1',
        tender_id: 't-a',
        tender: tenderA,
        expiry_date: '2026-09-01',
      }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.rowKind).toBe('lot')
    expect(rows[0]?.href).toBe(ROUTES.deals.detail('d1'))
    expect(rows[0]?.title).toBe('Los 1')
  })

  it('setzt ab zwei Losen ein Band und behält die Los-Felder', () => {
    const rows = groupDealsForCollection([
      deal({
        id: 'alone',
        title: 'Allein',
        expiry_date: '2026-10-01',
      }),
      deal({
        id: 'd2',
        title: 'Los 2',
        status: 'negotiation',
        company_id: 'co-2',
        company_name: 'Los-Firma',
        account_manager_name: 'Sam',
        tender_id: 't-a',
        tender: tenderA,
        expiry_date: '2026-09-20',
        volume: '10 Mio. €',
      }),
      deal({
        id: 'd1',
        title: 'Los 1',
        status: 'won',
        tender_id: 't-a',
        tender: tenderA,
        expiry_date: '2026-09-01',
      }),
    ])

    expect(rows.map((row) => row.rowKind)).toEqual(['band', 'lot', 'lot', 'lot'])
    const band = rows[0]
    expect(band?.rowKind).toBe('band')
    if (band?.rowKind !== 'band') return
    expect(band.title).toBe('BMI 2026')
    expect(band.href).toBe(ROUTES.tenders.detail('t-a'))
    expect(band.derivedStatusLabel).toBe('läuft · 1 von 2 gewonnen')
    expect(band.nextDeadline.date).toBe('2026-09-01')
    expect(band.companyName).toBe('BMI')

    const lot2 = rows[1]
    expect(lot2?.rowKind).toBe('lot')
    if (lot2?.rowKind !== 'lot') return
    expect(lot2.href).toBe(ROUTES.deals.detail('d2'))
    expect(lot2.company_name).toBe('Los-Firma')
    expect(lot2.expiry_date).toBe('2026-09-20')
    expect(lot2.account_manager_name).toBe('Sam')
    expect(lot2.volume).toBe('10 Mio. €')

    expect(rows[3]?.title).toBe('Allein')
  })

  it('nimmt die maßgebliche Frist, nicht expiry_date, für das Band', () => {
    const rows = groupDealsForCollection([
      deal({
        id: 'd1',
        title: 'Los 1',
        tender_id: 't-a',
        tender: tenderA,
        expiry_date: '2026-09-01',
        deadline: {
          date: '2026-10-15',
          text: null,
          isApproximate: false,
          origin: 'tender',
        },
      }),
      deal({
        id: 'd2',
        title: 'Los 2',
        tender_id: 't-a',
        tender: tenderA,
        expiry_date: '2026-09-01',
        deadline: {
          date: '2026-10-15',
          text: null,
          isApproximate: false,
          origin: 'tender',
        },
      }),
    ])
    const band = rows[0]
    expect(band?.rowKind).toBe('band')
    if (band?.rowKind !== 'band') return
    expect(band.nextDeadline.date).toBe('2026-10-15')
    expect(band.nextDeadline.origin).toBe('tender')
  })
})
