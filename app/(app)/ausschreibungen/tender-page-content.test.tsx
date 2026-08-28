import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TenderPageContent } from '@/app/(app)/ausschreibungen/tender-page-content'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import type { TenderPageData } from '@/lib/tenders/load-tender-page-data'
import { formatLotPriorityGapHint } from '@/lib/tenders/lot-priority-gap'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/app/(app)/deals/tender-actions', () => ({
  updateTenderStammdatenAction: vi.fn(),
  setTenderLotPrioritiesAction: vi.fn(),
}))

vi.mock('@/app/(app)/deals/cockpit/deal-deadlines-card', () => ({
  DealDeadlinesCard: () => null,
}))

vi.mock('@/app/(app)/deals/cockpit/deal-documents-section', () => ({
  DealDocumentsSection: () => null,
}))

const emptyPeople = {
  account_manager_id: null,
  sales_manager_id: null,
  account_manager_name: null,
  account_manager_avatar_url: null,
  sales_manager_name: null,
  sales_manager_avatar_url: null,
}

const emptyProof: {
  bidDecision: 'go' | 'no-bid' | null
  proofCount: number
  proofBestScore: number | null
} = {
  bidDecision: null,
  proofCount: 0,
  proofBestScore: null,
}

const tender: TenderPageData = {
  id: 't1',
  title: 'BMI 2026',
  company_id: 'c1',
  company_name: 'Beschaffungsamt des BMI',
  procedure_type: null,
  reference_number: null,
  total_volume: null,
  max_lots_bid: null,
  max_lots_award: null,
  lot_priority_required: null,
  derivedStatus: { kind: 'running', won: 1, bid: 2 },
  deadlines: [],
  documents: [],
  lots: [
    {
      id: 'lot-1',
      title: 'Los 1 — ITZBund',
      volume: '34000000',
      status: 'won',
      lot_priority: null,
      ...emptyPeople,
      ...emptyProof,
      account_manager_name: 'Mara Account Manager',
      account_manager_avatar_url: null,
    },
    {
      id: 'lot-5',
      title: 'Los 5 — Unmittelbare Bundesverwaltung',
      volume: '25000000',
      status: 'negotiation',
      lot_priority: null,
      ...emptyPeople,
      ...emptyProof,
      sales_manager_name: 'Sam Sales Rep',
      sales_manager_avatar_url: null,
      proofCount: 1,
      proofBestScore: 0.82,
    },
    {
      id: 'lot-7',
      title: 'Los 7 — Mittelbare Bundesverwaltung',
      volume: '9000000',
      status: 'withdrawn',
      lot_priority: null,
      ...emptyPeople,
      ...emptyProof,
      bidDecision: 'no-bid',
    },
  ],
}

function focusableInside(link: HTMLElement) {
  return link.querySelectorAll('a, button, [tabindex]')
}

describe('TenderPageContent lot tiles', () => {
  it('zeigt Avatare des jeweiligen Loses und lässt unzugewiesene Kacheln leer', () => {
    render(<TenderPageContent tender={tender} orgDateDisplayFormat="de-DE" />)

    const lot1 = screen.getByRole('link', { name: /Los 1 — ITZBund/ })
    expect(lot1).toHaveAttribute('href', ROUTES.deals.detail('lot-1'))
    expect(
      within(lot1).getByTitle(`${COPY.roles.accountManager}: Mara Account Manager`),
    ).toBeTruthy()
    expect(within(lot1).queryByTitle(/Sales Manager/)).toBeNull()
    expect(within(lot1).queryAllByRole('link')).toHaveLength(0)
    expect(within(lot1).queryAllByRole('button')).toHaveLength(0)

    const lot5 = screen.getByRole('link', {
      name: /Los 5 — Unmittelbare Bundesverwaltung/,
    })
    expect(lot5).toHaveAttribute('href', ROUTES.deals.detail('lot-5'))
    expect(
      within(lot5).getByTitle(`${COPY.roles.salesManager}: Sam Sales Rep`),
    ).toBeTruthy()

    const lot7 = screen.getByRole('link', { name: /Los 7 — Mittelbare Bundesverwaltung/ })
    expect(lot7).toHaveAttribute('href', ROUTES.deals.detail('lot-7'))
    expect(within(lot7).queryByTitle(/Account Manager/)).toBeNull()
    expect(within(lot7).queryByTitle(/Sales Manager/)).toBeNull()
  })

  it('zeigt den Beweis-Kreis bei Score und lässt leere Kacheln ohne Fokus-Kinder', () => {
    render(<TenderPageContent tender={tender} orgDateDisplayFormat="de-DE" />)

    const lot5 = screen.getByRole('link', {
      name: /Los 5 — Unmittelbare Bundesverwaltung/,
    })
    expect(within(lot5).getByText('82%')).toBeTruthy()
    expect(within(lot5).getByLabelText('Sehr hohe Relevanz · 82%')).toBeTruthy()

    const lot1 = screen.getByRole('link', { name: /Los 1 — ITZBund/ })
    expect(within(lot1).getByLabelText('Keine Referenzen')).toBeTruthy()
    expect(focusableInside(lot1)).toHaveLength(0)
  })

  it('zeigt NO-BID ohne Gedankenstrich', () => {
    render(<TenderPageContent tender={tender} orgDateDisplayFormat="de-DE" />)

    const lot7 = screen.getByRole('link', { name: /Los 7 — Mittelbare Bundesverwaltung/ })
    expect(within(lot7).getByText(COPY.tenders.bidNoBid)).toBeTruthy()
    expect(within(lot7).queryByLabelText('Keine Referenzen')).toBeNull()
    expect(focusableInside(lot7)).toHaveLength(0)
  })

  it('zeigt drei Zuschlagslimit-Zeilen als unbekannt', () => {
    render(<TenderPageContent tender={tender} orgDateDisplayFormat="de-DE" />)

    expect(screen.getAllByRole('term').map((el) => el.textContent)).toEqual([
      COPY.tenders.maxLotsBid,
      COPY.tenders.maxLotsAward,
      COPY.tenders.lotPriorityRequired,
    ])
    expect(screen.getAllByRole('definition').map((el) => el.textContent)).toEqual([
      COPY.tenders.unknown,
      COPY.tenders.unknown,
      COPY.tenders.unknown,
    ])
  })

  it('zeigt keinen Hinweis bei award 3 und Los 7 withdrawn', () => {
    render(
      <TenderPageContent
        tender={{ ...tender, max_lots_award: 3, lot_priority_required: true }}
        orgDateDisplayFormat="de-DE"
      />,
    )
    expect(screen.queryByText(/keine Rangfolge gesetzt/)).toBeNull()
  })

  it('zeigt den Hinweis bei award 1 ohne gesetzte Ränge', () => {
    render(
      <TenderPageContent
        tender={{ ...tender, max_lots_award: 1, lot_priority_required: true }}
        orgDateDisplayFormat="de-DE"
      />,
    )
    expect(screen.getByText(formatLotPriorityGapHint(2, 1))).toBeTruthy()
  })

  it('zeigt Rang-Marke und keinen Hinweis wenn ein Rang gesetzt ist', () => {
    const lots = tender.lots.map((lot, index) =>
      index === 0 ? { ...lot, lot_priority: 1 } : lot,
    )
    render(
      <TenderPageContent
        tender={{ ...tender, max_lots_award: 1, lot_priority_required: true, lots }}
        orgDateDisplayFormat="de-DE"
      />,
    )
    expect(screen.queryByText(/keine Rangfolge gesetzt/)).toBeNull()
    const lot1 = screen.getByRole('link', { name: /Los 1 — ITZBund/ })
    expect(
      within(lot1).getByText(COPY.tenders.rankLabel.replace('{n}', '1')),
    ).toBeTruthy()
  })
})
