import { describe, expect, it } from 'vitest'

import type { ReferenceRow } from '@/app/(app)/actions'
import { filterAndSortReferences, normalizeTagLabel } from './filter-sort-references'

function makeRef(
  overrides: Partial<ReferenceRow> & Pick<ReferenceRow, 'id' | 'title'>,
): ReferenceRow {
  return {
    summary: null,
    industry: null,
    country: null,
    status: 'approved',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: null,
    company_id: 'c1',
    company_name: 'Acme',
    website: null,
    employee_count: null,
    volume_eur: null,
    contract_type: null,
    incumbent_provider: null,
    competitors: null,
    customer_challenge: null,
    our_solution: null,
    customer_contact: null,
    is_favorited: false,
    tags: null,
    project_status: null,
    project_start: null,
    project_end: null,
    duration_months: null,
    ...overrides,
  }
}

const emptyIndustry = new Map<string, string>()

const baseArgs = {
  salesAppView: false,
  favoritesOnly: false,
  search: '',
  statusFilter: 'all',
  companyFilter: 'all',
  tagsFilter: 'all',
  industryFilter: 'all',
  countryFilter: 'all',
  projectStatusFilter: 'all',
  volumeFilter: 'all' as const,
  sortKey: null,
  sortDir: 'asc' as const,
  companyIndustryById: emptyIndustry,
}

describe('filterAndSortReferences', () => {
  it('filtert auf Favoriten wenn favoritesOnly gesetzt ist', () => {
    const refs = [
      makeRef({ id: '1', title: 'A', is_favorited: true }),
      makeRef({ id: '2', title: 'B', is_favorited: false }),
      makeRef({ id: '3', title: 'C', is_favorited: true }),
    ]
    const result = filterAndSortReferences({
      ...baseArgs,
      references: refs,
      favoritesOnly: true,
    })
    expect(result.map((r) => r.id)).toEqual(['1', '3'])
  })

  it('filtert approval_pending über customer_approval_status und Legacy-pending', () => {
    const refs = [
      makeRef({
        id: 'pending-approval',
        title: 'Pending Approval',
        status: 'approved',
        customer_approval_status: 'pending',
      }),
      makeRef({
        id: 'legacy-pending',
        title: 'Legacy Pending',
        status: 'pending' as ReferenceRow['status'],
      }),
      makeRef({ id: 'ok', title: 'Ok', status: 'approved' }),
      makeRef({ id: 'draft', title: 'Draft', status: 'draft' }),
    ]
    const result = filterAndSortReferences({
      ...baseArgs,
      references: refs,
      statusFilter: 'approval_pending',
    })
    expect(result.map((r) => r.id).sort()).toEqual(['legacy-pending', 'pending-approval'])
  })

  it('sucht in company_name und title', () => {
    const refs = [
      makeRef({ id: '1', title: 'Cloud Migration', company_name: 'SAP' }),
      makeRef({ id: '2', title: 'KI Plattform', company_name: 'Lufthansa' }),
      makeRef({ id: '3', title: 'SAP Integration', company_name: 'BMW' }),
    ]
    const byCompany = filterAndSortReferences({
      ...baseArgs,
      references: refs,
      search: 'lufthansa',
    })
    expect(byCompany.map((r) => r.id)).toEqual(['2'])

    const byTitle = filterAndSortReferences({
      ...baseArgs,
      references: refs,
      search: 'sap',
    })
    expect(byTitle.map((r) => r.id).sort()).toEqual(['1', '3'])
  })

  it('sortiert Standard nach Projektjahr absteigend, updated_at nur bei Gleichstand', () => {
    const refs = [
      makeRef({
        id: 'old',
        title: 'Old',
        project_end: '2015-01-01',
        updated_at: '2026-08-15T00:00:00.000Z',
      }),
      makeRef({
        id: 'new',
        title: 'New',
        project_end: '2019-12-01',
        updated_at: '2020-01-01T00:00:00.000Z',
      }),
    ]
    const result = filterAndSortReferences({
      ...baseArgs,
      references: refs,
      sortKey: 'project_year',
      sortDir: 'desc',
    })
    expect(result.map((r) => r.id)).toEqual(['new', 'old'])
  })
})

describe('normalizeTagLabel', () => {
  it('normalisiert Tags auf ersten Buchstaben groß', () => {
    expect(normalizeTagLabel('  cloud  ')).toBe('Cloud')
  })
})
