import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import type { DealWithReferences } from '../types'

import { EditDealDialog } from './edit-deal-dialog'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('../actions', () => ({
  updateDeal: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/forms/industry-select', () => ({
  IndustrySelect: () => null,
}))

function deal(overrides: Partial<DealWithReferences> = {}): DealWithReferences {
  return {
    id: 'deal-1',
    title: 'Los 1',
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
    tender_id: 'tender-1',
    tender: {
      id: 'tender-1',
      title: 'BMI 2026',
      company_id: null,
      company_name: null,
      company_logo_url: null,
      procedure_type: null,
      reference_number: null,
      total_volume: null,
    },
    expiry_date: '2026-09-01',
    deadline: {
      date: '2026-10-15',
      text: null,
      isApproximate: false,
      origin: 'tender',
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    best_match_score: null,
    linked_refs: [],
    references: [],
    ...overrides,
  }
}

describe('EditDealDialog deadline lock', () => {
  it('locks the field when origin is tender and links to the Ausschreibung', () => {
    render(
      <EditDealDialog
        deal={deal()}
        companies={[]}
        orgProfiles={[]}
        open
        onOpenChange={() => undefined}
        showTrigger={false}
      />,
    )

    const input = screen.getByLabelText(COPY.deals.editDeadlineLabel)
    expect(input).toBeDisabled()
    const link = screen.getByRole('link', {
      name: COPY.deals.cockpit.editInheritedDeadline,
    })
    expect(link).toHaveAttribute('href', ROUTES.tenders.detail('tender-1'))
  })
})
