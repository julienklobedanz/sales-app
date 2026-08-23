import { describe, expect, it } from 'vitest'

import {
  COLUMN_KEYS,
  COLUMN_ORDER_STORAGE_KEY,
  COLUMN_SIZING_STORAGE_KEY,
  COLUMN_VISIBLE_STORAGE_KEY,
  DEFAULT_VISIBLE,
} from '@/app/(app)/overview/reference-overview-columns'
import {
  DEAL_COLUMN_SIZING_STORAGE_KEY,
  DEAL_COLUMNS_STORAGE_KEY,
  DEAL_DEFAULT_COLUMN_ORDER,
  DEAL_INITIAL_COLUMN_VISIBILITY,
} from '@/app/(app)/deals/deals-table-constants'
import { normalizeDealColumnOrder } from '@/app/(app)/deals/use-deals-table-columns-state'
import {
  ACCOUNT_COLUMN_KEYS,
  ACCOUNT_COLUMNS_STORAGE_KEY,
  ACCOUNT_COLUMN_SIZING_STORAGE_KEY,
  ACCOUNT_COLUMN_VISIBLE_STORAGE_KEY,
  ACCOUNT_DEFAULT_VISIBLE,
} from '@/lib/accounts/account-collection-columns'

describe('S3 column storage bump', () => {
  it('uses new keys and does not read v1/v2 predecessors', () => {
    expect(COLUMN_ORDER_STORAGE_KEY).toBe('refstack:references:column-order-v3')
    expect(COLUMN_VISIBLE_STORAGE_KEY).toBe('refstack:references:column-visible-v3')
    expect(COLUMN_SIZING_STORAGE_KEY).toBe('refstack:references:column-sizing-v3')
    expect(DEAL_COLUMNS_STORAGE_KEY).toBe('refstack:deals:column-order-v3')
    expect(DEAL_COLUMN_SIZING_STORAGE_KEY).toBe('refstack:deals:column-sizing-v2')
    expect(ACCOUNT_COLUMNS_STORAGE_KEY).toBe('refstack:accounts:column-order-v1')
    expect(ACCOUNT_COLUMN_VISIBLE_STORAGE_KEY).toBe(
      'refstack:accounts:column-visible-v1',
    )
    expect(ACCOUNT_COLUMN_SIZING_STORAGE_KEY).toBe(
      'refstack:accounts:column-sizing-v1',
    )
  })

  it('defaults follow the documented visible columns', () => {
    expect(DEFAULT_VISIBLE.company).toBe(true)
    expect(DEFAULT_VISIBLE.title).toBe(true)
    expect(DEFAULT_VISIBLE.summary).toBe(true)
    expect(DEFAULT_VISIBLE.status).toBe(true)
    expect(DEFAULT_VISIBLE.project_year).toBe(true)
    expect(DEFAULT_VISIBLE.industry).toBe(false)
    expect(DEFAULT_VISIBLE.updated_at).toBe(false)
    expect(COLUMN_KEYS).toContain('summary')
    expect(COLUMN_KEYS).toContain('project_year')
  })

  it('drops the deals select column and old proof split', () => {
    expect(DEAL_DEFAULT_COLUMN_ORDER).not.toContain('select')
    expect(DEAL_DEFAULT_COLUMN_ORDER).not.toContain('reference_count')
    expect(DEAL_DEFAULT_COLUMN_ORDER).not.toContain('match')
    expect(DEAL_DEFAULT_COLUMN_ORDER).toContain('proof')
    expect(DEAL_INITIAL_COLUMN_VISIBILITY.proof).toBe(true)
    const normalized = normalizeDealColumnOrder([
      'select',
      'title',
      'match',
      'company_name',
    ])
    expect(normalized).not.toContain('select')
    expect(normalized).not.toContain('match')
    expect(normalized).not.toContain('reference_count')
    expect(new Set(normalized)).toEqual(new Set(DEAL_DEFAULT_COLUMN_ORDER))
  })

  it('defaults accounts columns to the documented Leitfrage', () => {
    expect(ACCOUNT_DEFAULT_VISIBLE.company).toBe(true)
    expect(ACCOUNT_DEFAULT_VISIBLE.proofs).toBe(true)
    expect(ACCOUNT_DEFAULT_VISIBLE.deals).toBe(true)
    expect(ACCOUNT_DEFAULT_VISIBLE.nda).toBe(true)
    expect(ACCOUNT_DEFAULT_VISIBLE.industry).toBe(false)
    expect(ACCOUNT_DEFAULT_VISIBLE.headquarters).toBe(false)
    expect(ACCOUNT_COLUMN_KEYS).toEqual([
      'company',
      'proofs',
      'deals',
      'nda',
      'industry',
      'headquarters',
    ])
  })
})
