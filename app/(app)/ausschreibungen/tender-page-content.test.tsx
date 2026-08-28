import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TenderPageContent } from '@/app/(app)/ausschreibungen/tender-page-content'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import type { TenderPageData } from '@/lib/tenders/load-tender-page-data'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/app/(app)/deals/cockpit/deal-deadlines-card', () => ({
  DealDeadlinesCard: () => null,
}))

const emptyPeople = {
  account_manager_name: null,
  account_manager_avatar_url: null,
  sales_manager_name: null,
  sales_manager_avatar_url: null,
}

const tender: TenderPageData = {
  id: 't1',
  title: 'BMI 2026',
  company_id: 'c1',
  company_name: 'Beschaffungsamt des BMI',
  procedure_type: null,
  reference_number: null,
  total_volume: null,
  derivedStatus: { kind: 'running', won: 1, bid: 2 },
  deadlines: [],
  lots: [
    {
      id: 'lot-1',
      title: 'Los 1 — ITZBund',
      volume: '34000000',
      status: 'won',
      ...emptyPeople,
      account_manager_name: 'Mara Account Manager',
      account_manager_avatar_url: null,
    },
    {
      id: 'lot-5',
      title: 'Los 5 — Unmittelbare Bundesverwaltung',
      volume: '25000000',
      status: 'negotiation',
      ...emptyPeople,
      sales_manager_name: 'Sam Sales Rep',
      sales_manager_avatar_url: null,
    },
    {
      id: 'lot-7',
      title: 'Los 7 — Mittelbare Bundesverwaltung',
      volume: '9000000',
      status: 'withdrawn',
      ...emptyPeople,
    },
  ],
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

    const lot5 = screen.getByRole('link', { name: /Los 5 — Unmittelbare Bundesverwaltung/ })
    expect(lot5).toHaveAttribute('href', ROUTES.deals.detail('lot-5'))
    expect(
      within(lot5).getByTitle(`${COPY.roles.salesManager}: Sam Sales Rep`),
    ).toBeTruthy()

    const lot7 = screen.getByRole('link', { name: /Los 7 — Mittelbare Bundesverwaltung/ })
    expect(lot7).toHaveAttribute('href', ROUTES.deals.detail('lot-7'))
    expect(within(lot7).queryByTitle(/Account Manager/)).toBeNull()
    expect(within(lot7).queryByTitle(/Sales Manager/)).toBeNull()
  })
})
