import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'
import {
  loadOrCreateDealRfpEligibilityCriteriaForDocument,
  parseEligibilityStoredValue,
  rowsForEligibilityInsert,
} from '@/lib/deals/persist-deal-rfp-eligibility-criteria'

type EligibilityRow = {
  id: string
  deal_id: string
  organization_id: string
  source_document_id: string
  dimension: string
  label: string
  operator: string
  value: number | string
  unit: string | null
  mandatory: boolean
  confidence: string
  evidence: string | null
}

function createMemoryClient() {
  const rows: EligibilityRow[] = []
  let seq = 0
  let insertCount = 0

  const from = vi.fn((table: string) => {
    if (table !== 'deal_rfp_eligibility_criteria') {
      throw new Error(`unexpected table ${table}`)
    }
    return {
      select() {
        const filters: Record<string, string> = {}
        const chain = {
          eq(col: string, value: string) {
            filters[col] = value
            return chain
          },
          then(
            onFulfilled: (v: { data: EligibilityRow[]; error: null }) => unknown,
            onRejected?: (e: unknown) => unknown,
          ) {
            const data = rows.filter(
              (row) =>
                row.deal_id === filters.deal_id &&
                row.source_document_id === filters.source_document_id &&
                row.organization_id === filters.organization_id,
            )
            return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
          },
        }
        return chain
      },
      insert(payload: Array<Omit<EligibilityRow, 'id'>>) {
        insertCount += 1
        const inserted = payload.map((item) => {
          const row: EligibilityRow = { ...item, id: `elig-${++seq}` }
          rows.push(row)
          return row
        })
        return {
          select() {
            return Promise.resolve({ data: inserted, error: null })
          },
        }
      },
    }
  })

  return { supabase: { from }, rows, insertCount: () => insertCount }
}

const NUMERIC: EligibilityCriterion = {
  id: 'llm-slug',
  dimension: 'employee_count',
  label: 'Mindestens 500 Mitarbeiter',
  operator: 'gte',
  value: 500,
  unit: 'MA',
  mandatory: true,
  confidence: 'high',
}

const TEXT: EligibilityCriterion = {
  id: 'stqc-slug',
  dimension: 'certification',
  label: 'STQC',
  operator: 'contains',
  value: 'STQC',
  mandatory: true,
  confidence: 'high',
}

describe('parseEligibilityStoredValue', () => {
  it('keeps numbers as numbers and strings as strings', () => {
    expect(parseEligibilityStoredValue(500)).toBe(500)
    expect(parseEligibilityStoredValue('STQC')).toBe('STQC')
    expect(parseEligibilityStoredValue('500')).toBe('500')
    expect(parseEligibilityStoredValue(null)).toBeNull()
  })
})

describe('rowsForEligibilityInsert', () => {
  it('dedupes on dimension, operator and value, not on label', () => {
    const dup: EligibilityCriterion = {
      ...TEXT,
      id: 'other',
      label: 'STQC Audit',
    }
    expect(rowsForEligibilityInsert([TEXT, dup])).toHaveLength(1)
  })
})

describe('loadOrCreateDealRfpEligibilityCriteriaForDocument', () => {
  it('skips extract and insert on a second run for the same document', async () => {
    const memory = createMemoryClient()
    const extract = vi.fn().mockResolvedValue({ criteria: [NUMERIC, TEXT] })
    const args = {
      dealId: 'deal-1',
      organizationId: 'org-1',
      sourceDocumentId: 'doc-1',
      extract,
    }

    const first = await loadOrCreateDealRfpEligibilityCriteriaForDocument(
      memory.supabase as never,
      args,
    )
    const second = await loadOrCreateDealRfpEligibilityCriteriaForDocument(
      memory.supabase as never,
      args,
    )

    expect(extract).toHaveBeenCalledTimes(1)
    expect(memory.insertCount()).toBe(1)
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.criteria).toEqual(first.criteria)
    expect(memory.rows).toHaveLength(2)
    expect(first.criteria[0]?.id).toMatch(/^elig-/)
    expect(first.criteria.find((c) => c.dimension === 'employee_count')?.value).toBe(500)
    expect(first.criteria.find((c) => c.dimension === 'certification')?.value).toBe(
      'STQC',
    )
  })

  it('adds rows for a second document without changing the first', async () => {
    const memory = createMemoryClient()
    const firstExtract = vi.fn().mockResolvedValue({ criteria: [NUMERIC] })
    const secondExtract = vi.fn().mockResolvedValue({ criteria: [TEXT] })

    const first = await loadOrCreateDealRfpEligibilityCriteriaForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-1',
        extract: firstExtract,
      },
    )
    const second = await loadOrCreateDealRfpEligibilityCriteriaForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-2',
        extract: secondExtract,
      },
    )

    expect(first.criteria).toHaveLength(1)
    expect(second.criteria).toHaveLength(1)
    expect(second.criteria[0]?.id).not.toBe(first.criteria[0]?.id)
    expect(memory.rows.filter((row) => row.source_document_id === 'doc-1')).toHaveLength(
      1,
    )
    expect(memory.rows.filter((row) => row.source_document_id === 'doc-2')).toHaveLength(
      1,
    )
  })

  it('creates a separate set when two lots analyze the same document', async () => {
    const memory = createMemoryClient()
    const extract = vi.fn().mockResolvedValue({ criteria: [NUMERIC] })

    const first = await loadOrCreateDealRfpEligibilityCriteriaForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-1',
        extract,
      },
    )
    const second = await loadOrCreateDealRfpEligibilityCriteriaForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-2',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-1',
        extract,
      },
    )

    expect(first.created).toBe(true)
    expect(second.created).toBe(true)
    expect(extract).toHaveBeenCalledTimes(2)
    expect(memory.rows).toHaveLength(2)
    expect(memory.rows.every((row) => row.source_document_id === 'doc-1')).toBe(true)
    expect(memory.rows.map((row) => row.deal_id).sort()).toEqual(['deal-1', 'deal-2'])
  })
})
