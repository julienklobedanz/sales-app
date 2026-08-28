import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { demoteTenderDocumentsToDeal } from '@/lib/tenders/move-documents'

describe('demoteTenderDocumentsToDeal', () => {
  it('sets deal_id and clears tender_id without rewriting storage_path', async () => {
    const updates: Array<Record<string, unknown>> = []
    const from = vi.fn((table: string) => {
      if (table !== 'deal_documents') throw new Error(table)
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ data: [{ id: 'doc-1' }], error: null })
                },
              }
            },
          }
        },
        update(payload: Record<string, unknown>) {
          updates.push(payload)
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ error: null })
                },
              }
            },
          }
        },
      }
    })

    const result = await demoteTenderDocumentsToDeal({ from } as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })

    expect(result).toEqual({ success: true })
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ deal_id: 'deal-1', tender_id: null })
    expect(updates[0]).not.toHaveProperty('storage_path')
  })
})
