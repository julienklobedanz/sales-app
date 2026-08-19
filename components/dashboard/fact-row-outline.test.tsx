import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DealFactsCard } from '@/app/dashboard/deals/cockpit/deal-facts-card'
import { DealRfpStammdatenSection } from '@/app/dashboard/deals/cockpit/deal-rfp-stammdaten-section'
import { ApprovalCaseDataBar } from '@/app/approval/[token]/approval-case-data-bar'
import { ReferenceContentCore } from '@/components/references/reference-content-core'
import type { DealWithReferences } from '@/app/dashboard/deals/types'
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

vi.mock('@/app/dashboard/deals/components/edit-deal-dialog', () => ({
  EditDealDialog: () => null,
}))

vi.mock('@/app/dashboard/actions', () => ({
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

const deal: DealWithReferences = {
  id: 'd1',
  title: 'Ausschreibung Stadtwerke',
  company_id: null,
  company_name: 'Stadtwerke',
  industry: 'tech',
  volume: null,
  incumbent_provider: null,
  is_public: false,
  account_manager_id: null,
  account_manager_name: 'Marc AM',
  sales_manager_id: null,
  sales_manager_name: 'Sam Sales',
  status: 'open',
  is_rfp_mode: false,
  expiry_date: '2026-04-18',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
  best_match_score: null,
  references: [],
}

function termNames() {
  return screen.getAllByRole('term').map((el) => el.textContent)
}

describe('§11.4 fact-row outline', () => {
  it('Deal-Fakten: Labels sind terms', () => {
    render(<DealFactsCard deal={deal} companies={[]} orgProfiles={[]} />)

    expect(termNames()).toEqual(
      expect.arrayContaining(['Branche', 'Close', COPY.roles.accountManager]),
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
