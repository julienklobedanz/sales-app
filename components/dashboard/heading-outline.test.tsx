import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AuthBrandPanel } from '@/components/auth-brand-panel'
import { AuthShell } from '@/components/auth-shell'
import { DashboardListPageHeader } from '@/components/dashboard/dashboard-list-page-header'
import { AUTH_BRAND_CONTENT } from '@/lib/auth/brand-content'
import { ReferenceDetailHeader } from '@/app/dashboard/references/[id]/reference-detail-header'
import { DealCockpitHeader } from '@/app/dashboard/deals/cockpit/deal-cockpit-header'
import type { DealWithReferences } from '@/app/dashboard/deals/types'
import { ShowcaseSingleReference } from '@/app/p/[slug]/showcase-single-reference'
import type { PublicReference } from '@/app/p/actions'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/references',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/app/dashboard/actions', () => ({
  toggleFavorite: vi.fn(),
}))

vi.mock('@/app/dashboard/deals/cockpit/deal-cockpit-actions', () => ({
  DealCockpitActions: () => null,
}))

vi.mock('@/app/p/[slug]/showcase-floating-actions', () => ({
  ShowcaseFloatingActions: () => null,
}))

vi.mock('@/app/p/[slug]/showcase-project-details', () => ({
  ShowcaseProjectDetails: () => null,
}))

vi.mock('@/app/p/[slug]/showcase-reference-content', () => ({
  ShowcaseReferenceContent: () => null,
}))

function headingsByLevel(level: number) {
  return screen.queryAllByRole('heading', { level })
}

const paneHeaderProps = {
  title: 'Kundenprojekt Nord',
  status: 'approved',
  customerApprovalStatus: null,
  approvalInternalStatus: null,
  approvalRequestedAt: null,
  approvalScopeNamedMention: null,
  approvalScopeAnonymousMention: null,
  headerCompany: 'Nord AG',
  companyId: 'c1',
  isAnonymizedView: false,
  industryLabel: null,
  employeeMetaLabel: null,
  locationMetaLabel: null,
  websiteMetaHref: null,
  tags: [] as string[],
}

const publicReference: PublicReference = {
  id: 'r1',
  title: 'Cloud-Migration',
  summary: null,
  industry: null,
  country: null,
  status: 'approved',
  company_name: 'Nord AG',
  company_logo_url: null,
  website: null,
  employee_count: null,
  volume_eur: null,
  contract_type: null,
  incumbent_provider: null,
  competitors: null,
  customer_challenge: null,
  our_solution: null,
  tags: null,
  project_status: null,
  project_start: null,
  project_end: null,
  duration_months: null,
  approval_quote_approved: null,
  approval_reference_giver_name: null,
}

const deal: DealWithReferences = {
  id: 'd1',
  title: 'Ausschreibung Stadtwerke',
  company_id: null,
  company_name: 'Stadtwerke',
  industry: null,
  volume: null,
  incumbent_provider: null,
  is_public: false,
  account_manager_id: null,
  account_manager_name: null,
  sales_manager_id: null,
  sales_manager_name: null,
  status: 'open',
  is_rfp_mode: false,
  expiry_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
  best_match_score: null,
  references: [],
}

describe('§11.2 heading outline', () => {
  it('Collection: genau ein h1', () => {
    render(<DashboardListPageHeader />)

    expect(headingsByLevel(1)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Referenzen')
  })

  it('Collection+Pane: Collection-h1, Objekt-h2, kein zweites h1', () => {
    render(
      <>
        <DashboardListPageHeader />
        <ReferenceDetailHeader {...paneHeaderProps} />
      </>,
    )

    expect(headingsByLevel(1)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Referenzen')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Kundenprojekt Nord')
  })

  it('Deal-Cockpit: genau ein h1', () => {
    render(
      <DealCockpitHeader
        deal={deal}
        companies={[]}
        orgProfiles={[]}
        canManageDocuments={false}
      />,
    )

    expect(headingsByLevel(1)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Ausschreibung Stadtwerke',
    )
  })

  it('Öffentliches Portfolio: genau ein h1', () => {
    render(
      <ShowcaseSingleReference
        slug="abc"
        reference={publicReference}
        branding={{
          name: 'Acme',
          logo_url: null,
          primary_color: '#111',
          secondary_color: '#666',
        }}
        workspaceName="Acme"
        shareOwnerName="Ada Lovelace"
        shareOwnerPosition="Sales"
        shareOwnerAvatar={null}
        shareOwnerEmail={null}
        shareOwnerPhone={null}
        shareOwnerBookingUrl={null}
        canDeactivate={false}
        revokeMode={false}
      />,
    )

    expect(headingsByLevel(1)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cloud-Migration')
  })

  it('Login: genau ein h1, Marketing-Spalte ist kein Heading', () => {
    render(
      <AuthShell brandContent={AUTH_BRAND_CONTENT.login}>
        <h1 className="text-2xl font-bold tracking-tight">Willkommen zurück.</h1>
      </AuthShell>,
    )

    expect(headingsByLevel(1)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Willkommen zurück.')
    expect(headingsByLevel(2)).toHaveLength(0)
  })

  it('Auth-Brand rendert den Claim als Text, nicht als Überschrift', () => {
    render(<AuthBrandPanel content={AUTH_BRAND_CONTENT.login} />)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText(AUTH_BRAND_CONTENT.login.title)).toBeInTheDocument()
  })
})
