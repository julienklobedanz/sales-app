import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
})
