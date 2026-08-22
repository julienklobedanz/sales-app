import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ACCOUNT_LENS_CARE_KEYS } from '@/lib/accounts/account-lens'
import { COPY } from '@/lib/copy'

import { AccountLensPane, type AccountLensPayload } from './account-lens-pane'
import type { CompanyCard } from './accounts-collection-types'
import type { AccountDealRow } from './account-action-types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/company-logo', () => ({
  CompanyLogo: () => null,
}))

vi.mock('@/components/dashboard/meeting-prep-overlay', () => ({
  MeetingPrepOverlayDialog: () => null,
  runCreateMeetingPrep: vi.fn(),
  useMeetingPrepFlow: () => ({
    overlayOpen: false,
    setOverlayOpen: vi.fn(),
    overlayTitle: '',
    snapshot: null,
  }),
}))

vi.mock('./components/account-detail-nda-popover', () => ({
  AccountDetailNdaPopover: () => null,
}))

const company: CompanyCard = {
  id: 'co-1',
  name: 'Nordwind GmbH',
  logo_url: null,
  website_url: null,
  headquarters: 'Hamburg',
  industry: null,
}

const emptyPayload: AccountLensPayload = {
  references: [],
  activeDeals: [],
  ndaAgreements: [],
}

const openDeal: AccountDealRow = {
  id: 'deal-1',
  title: 'Rahmenvertrag 2026',
  volume: null,
  status: 'open',
  expiry_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
}

describe('AccountLensPane', () => {
  it('zeichnet keine Linsen-Controls und keine Care-Abschnitte', () => {
    const { container } = render(
      <AccountLensPane company={company} payload={emptyPayload} canManageNda={false} />,
    )

    expect(container.querySelectorAll('[data-lens-control]')).toHaveLength(0)

    const text = container.textContent ?? ''
    for (const key of ACCOUNT_LENS_CARE_KEYS) {
      expect(text).not.toContain(key)
    }

    expect(screen.queryByText(COPY.accounts.lens.dealsHeading)).not.toBeInTheDocument()
  })

  it('zeigt die Deals-Überschrift nur mit Payload', () => {
    const { rerender } = render(
      <AccountLensPane company={company} payload={emptyPayload} canManageNda={false} />,
    )
    expect(screen.queryByText(COPY.accounts.lens.dealsHeading)).not.toBeInTheDocument()

    rerender(
      <AccountLensPane
        company={company}
        payload={{ ...emptyPayload, activeDeals: [openDeal] }}
        canManageNda={false}
      />,
    )
    expect(screen.getByText(COPY.accounts.lens.dealsHeading)).toBeInTheDocument()
    expect(screen.getByText('Rahmenvertrag 2026')).toBeInTheDocument()
  })
})
