import { readFileSync } from 'node:fs'
import path from 'node:path'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TenderFactsSurface } from '@/app/(app)/ausschreibungen/tender-facts-surface'
import { DealRfpFactsSurface } from '@/app/(app)/deals/cockpit/deal-rfp-facts-surface'
import { DealRfpStammdatenSection } from '@/app/(app)/deals/cockpit/deal-rfp-stammdaten-section'
import { ApprovalCaseDataBar } from '@/app/approval/[token]/approval-case-data-bar'
import { ReferenceContentCore } from '@/components/references/reference-content-core'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { COPY } from '@/lib/copy'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/app/(app)/actions', () => ({
  updateReferenceAssetCategory: vi.fn(),
}))

vi.mock('@/app/(app)/deals/tender-actions', () => ({
  updateTenderStammdatenAction: vi.fn(),
}))

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as typeof IntersectionObserver
}

function termNames() {
  return screen.getAllByRole('term').map((el) => el.textContent)
}

describe('§11.4 fact-row outline', () => {
  it('Deal-Faktenfläche: Identitäts-Labels sind terms', () => {
    render(
      <DealRfpFactsSurface
        rows={[
          {
            key: 'customer',
            label: COPY.deals.cockpit.stammdatenFields.customer,
            value: 'Stadtwerke',
          },
          {
            key: 'procedure',
            label: COPY.deals.cockpit.stammdatenFields.procedure,
            value: 'Offenes Verfahren',
          },
        ]}
        lots={[]}
      />,
    )

    expect(termNames()).toEqual(
      expect.arrayContaining([
        COPY.deals.cockpit.stammdatenFields.customer,
        COPY.deals.cockpit.stammdatenFields.procedure,
      ]),
    )
  })

  it('RFP-Stammdaten: Labels sind terms', () => {
    render(
      <DealRfpStammdatenSection
        data={
          {
            stammdatenRows: [
              { key: 'customer', label: 'Auftraggeber', value: 'Stadtwerke' },
            ],
          } as DealRfpCockpitData
        }
      />,
    )

    expect(termNames()).toContain('Auftraggeber')
    expect(screen.getByRole('definition')).toHaveTextContent('Stadtwerke')
  })

  it('Referenz-Projektdetails: Labels sind terms', () => {
    render(
      <ReferenceContentCore
        surface="internal"
        volumeEur="1500000"
        contractType="Festpreis"
      />,
    )

    expect(termNames()).toEqual(expect.arrayContaining(['Volumen', 'Vertragsart']))
  })

  it('Freigabe-Datenleiste: Labels sind terms', () => {
    render(
      <ApprovalCaseDataBar
        items={[{ label: 'Branche', value: 'Energie' }]}
        referenceTitle="Cloud-Migration"
      />,
    )

    expect(termNames()).toContain('Branche')
    expect(screen.getByRole('definition')).toHaveTextContent('Energie')
  })

  it('Tender-Faktenfläche: Limit-Labels sind terms', () => {
    render(
      <TenderFactsSurface
        tender={{
          id: 't1',
          title: 'BMI 2026',
          procedure_type: null,
          reference_number: null,
          total_volume: null,
          max_lots_bid: null,
          max_lots_award: null,
          lot_priority_required: null,
        }}
      />,
    )

    expect(termNames()).toEqual([
      COPY.tenders.maxLotsBid,
      COPY.tenders.maxLotsAward,
      COPY.tenders.lotPriorityRequired,
    ])
  })

  it('DealRfpFactsSurface importiert FactsDl', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'app/(app)/deals/cockpit/deal-rfp-facts-surface.tsx'),
      'utf8',
    )
    expect(src).toMatch(/from ['"]@\/components\/dashboard\/facts-dl['"]/)
  })
})
