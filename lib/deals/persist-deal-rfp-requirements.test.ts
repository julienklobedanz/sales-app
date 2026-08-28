import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { loadOrCreateDealRfpRequirementsForDocument } from '@/lib/deals/persist-deal-rfp-requirements'

type RequirementRow = {
  id: string
  deal_id: string
  organization_id: string
  source_document_id: string
  text: string
  normalized_text: string
  category: string | null
}

function createMemoryClient() {
  const rows: RequirementRow[] = []
  let seq = 0
  let insertCount = 0

  const from = vi.fn((table: string) => {
    if (table !== 'deal_rfp_requirements') {
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
            onFulfilled: (v: { data: RequirementRow[]; error: null }) => unknown,
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
      insert(payload: Array<Omit<RequirementRow, 'id'>>) {
        insertCount += 1
        const inserted = payload.map((item) => {
          const row: RequirementRow = { ...item, id: `req-${++seq}` }
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

const EXTRACTED = [{ text: 'ISO 27001 Zertifikat', category: 'Compliance' }]

describe('loadOrCreateDealRfpRequirementsForDocument', () => {
  it('skips extract and insert on a second run for the same document', async () => {
    const memory = createMemoryClient()
    const extract = vi.fn().mockResolvedValue({ requirements: EXTRACTED })
    const args = {
      dealId: 'deal-1',
      organizationId: 'org-1',
      sourceDocumentId: 'doc-1',
      extract,
    }

    const first = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      args,
    )
    const second = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      args,
    )

    expect(extract).toHaveBeenCalledTimes(1)
    expect(memory.insertCount()).toBe(1)
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.requirements).toEqual(first.requirements)
    expect(memory.rows).toHaveLength(1)
  })

  it('adds rows for a second document without changing the first', async () => {
    const memory = createMemoryClient()
    const firstExtract = vi.fn().mockResolvedValue({ requirements: EXTRACTED })
    const secondExtract = vi
      .fn()
      .mockResolvedValue({ requirements: [{ text: 'SOC 2 Type II' }] })

    const first = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-1',
        extract: firstExtract,
      },
    )
    const second = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-2',
        extract: secondExtract,
      },
    )

    expect(first.requirements).toHaveLength(1)
    expect(second.requirements).toHaveLength(1)
    expect(second.requirements[0]?.id).not.toBe(first.requirements[0]?.id)
    expect(memory.rows.filter((row) => row.source_document_id === 'doc-1')).toHaveLength(
      1,
    )
    expect(memory.rows.filter((row) => row.source_document_id === 'doc-2')).toHaveLength(
      1,
    )
    expect(memory.rows.filter((row) => row.source_document_id === 'doc-1')[0]?.text).toBe(
      EXTRACTED[0]?.text,
    )
  })

  it('stores the same wording twice when it comes from two documents', async () => {
    const memory = createMemoryClient()
    const extract = vi.fn().mockResolvedValue({ requirements: EXTRACTED })

    const first = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-rfp',
        extract,
      },
    )
    const second = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-lv',
        extract,
      },
    )

    expect(first.requirements[0]?.text).toBe(EXTRACTED[0]?.text)
    expect(second.requirements[0]?.text).toBe(EXTRACTED[0]?.text)
    expect(first.requirements[0]?.id).not.toBe(second.requirements[0]?.id)
    expect(memory.rows).toHaveLength(2)
    expect(new Set(memory.rows.map((row) => row.source_document_id))).toEqual(
      new Set(['doc-rfp', 'doc-lv']),
    )
  })

  it('creates a separate set when two lots analyze the same document', async () => {
    const memory = createMemoryClient()
    const extract = vi.fn().mockResolvedValue({ requirements: EXTRACTED })

    const first = await loadOrCreateDealRfpRequirementsForDocument(
      memory.supabase as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        sourceDocumentId: 'doc-1',
        extract,
      },
    )
    const second = await loadOrCreateDealRfpRequirementsForDocument(
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
    expect(
      memory.rows.some((row) => row.deal_id !== 'deal-1' && row.deal_id !== 'deal-2'),
    ).toBe(false)
  })
})
