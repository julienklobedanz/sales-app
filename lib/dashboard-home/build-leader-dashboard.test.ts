import { describe, expect, it } from 'vitest'

import type { DealRow } from '@/app/(app)/deals/types'
import { resolvedFromExpiry } from '@/lib/deals/resolve-deal-deadline'
import { buildLeaderRiskDeals } from '@/lib/dashboard-home/build-leader-dashboard'

function deal(overrides: Partial<DealRow>): DealRow {
  const expiry_date =
    overrides.expiry_date !== undefined ? overrides.expiry_date : '2026-04-30'
  return {
    id: 'deal-1',
    title: 'Verhandlung Security',
    company_id: 'co-1',
    company_name: 'Acme',
    industry: null,
    volume: '1200000',
    requirements_text: null,
    incumbent_provider: null,
    is_public: true,
    account_manager_id: null,
    account_manager_name: null,
    sales_manager_id: null,
    sales_manager_name: null,
    status: 'negotiation',
    is_rfp_mode: false,
    tender_id: null,
    tender: null,
    expiry_date,
    salesforce_opportunity_id: null,
    crm_opportunity_id: null,
    crm_source: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    linked_refs: [{ id: 'ref-1', title: 'Ref', company_name: 'Kunde', logo_url: null }],
    best_match_score: 0.9,
    ...overrides,
    deadline: overrides.deadline ?? resolvedFromExpiry(expiry_date),
  }
}

describe('buildLeaderRiskDeals', () => {
  it('formats close date and coverage without deal volume', () => {
    const [row] = buildLeaderRiskDeals([deal({})], { dateDisplayFormat: 'de-DE' })
    expect(row?.subtitle).toBe('Frist 30.04.2026 · stark belegt')
  })

  it('uses en-US date format when configured in workspace settings', () => {
    const [row] = buildLeaderRiskDeals([deal({})], { dateDisplayFormat: 'en-US' })
    expect(row?.subtitle).toBe('Frist 04/30/2026 · stark belegt')
  })
})
