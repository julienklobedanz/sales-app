import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const promoteActiveRfpDeadlinesToTender = vi.fn()
const demoteTenderDeadlinesToDeal = vi.fn()
const demoteTenderDocumentsToDeal = vi.fn()
const revalidateTenderSurfaces = vi.fn()

vi.mock('./move-deadlines', () => ({
  promoteActiveRfpDeadlinesToTender: (...args: unknown[]) =>
    promoteActiveRfpDeadlinesToTender(...args),
  demoteTenderDeadlinesToDeal: (...args: unknown[]) =>
    demoteTenderDeadlinesToDeal(...args),
}))

vi.mock('./move-documents', () => ({
  demoteTenderDocumentsToDeal: (...args: unknown[]) =>
    demoteTenderDocumentsToDeal(...args),
}))

vi.mock('./revalidate-tender-surfaces', () => ({
  revalidateTenderSurfaces: (...args: unknown[]) => revalidateTenderSurfaces(...args),
}))

import {
  assignDealToExistingTender,
  detachDealFromTender,
} from '@/lib/tenders/assign-deal'

const deal = {
  id: 'deal-1',
  title: 'Los 1',
  company_id: 'co-1',
  tender_id: null as string | null,
  organization_id: 'org-1',
}

function chain(result: unknown, record?: { updates: unknown[] }) {
  const self = {
    select: () => self,
    insert: () => self,
    update: (payload: unknown) => {
      record?.updates.push(payload)
      return self
    },
    delete: () => self,
    eq: () => self,
    is: () => self,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return self
}

describe('assignDealToExistingTender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    promoteActiveRfpDeadlinesToTender.mockResolvedValue({ success: true })
    revalidateTenderSurfaces.mockResolvedValue(undefined)
    deal.tender_id = null
  })

  it('promotes rfp deadlines after linking the lot', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        return chain({ data: deal, error: null })
      }
      if (table === 'tenders') {
        return chain({ data: { id: 'tender-1' }, error: null })
      }
      throw new Error(table)
    })
    const result = await assignDealToExistingTender({ from } as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result).toEqual({ success: true, tenderId: 'tender-1' })
    expect(promoteActiveRfpDeadlinesToTender).toHaveBeenCalledWith(expect.anything(), {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
  })

  it('setzt lot_priority auf null beim Zuordnen', async () => {
    const updates: unknown[] = []
    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        return chain({ data: deal, error: null }, { updates })
      }
      if (table === 'tenders') {
        return chain({ data: { id: 'tender-1' }, error: null })
      }
      throw new Error(table)
    })
    await assignDealToExistingTender({ from } as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(updates).toContainEqual({ tender_id: 'tender-1', lot_priority: null })
  })
})

describe('detachDealFromTender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    demoteTenderDeadlinesToDeal.mockResolvedValue({ success: true })
    demoteTenderDocumentsToDeal.mockResolvedValue({ success: true })
    revalidateTenderSurfaces.mockResolvedValue(undefined)
  })

  it('demotes documents then deadlines before deleting the last-lot tender', async () => {
    const order: string[] = []
    const updates: unknown[] = []
    demoteTenderDocumentsToDeal.mockImplementation(async () => {
      order.push('demoteDocs')
      return { success: true }
    })
    demoteTenderDeadlinesToDeal.mockImplementation(async () => {
      order.push('demoteDeadlines')
      return { success: true }
    })
    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        const dealsChain = chain(
          {
            data: { ...deal, tender_id: 'tender-1' },
            error: null,
            count: 1,
          },
          { updates },
        )
        return {
          ...dealsChain,
          update: (payload: unknown) => {
            order.push('clearPriority')
            updates.push(payload)
            return dealsChain
          },
        }
      }
      if (table === 'tenders') {
        return {
          ...chain({ error: null }),
          delete: () => {
            order.push('delete')
            return chain({ error: null })
          },
        }
      }
      throw new Error(table)
    })
    const result = await detachDealFromTender({ from } as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
    })
    expect(result).toEqual({ success: true })
    expect(order).toEqual(['demoteDocs', 'demoteDeadlines', 'clearPriority', 'delete'])
    expect(updates).toContainEqual({ lot_priority: null })
    expect(demoteTenderDocumentsToDeal).toHaveBeenCalledWith(expect.anything(), {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(demoteTenderDeadlinesToDeal).toHaveBeenCalledWith(expect.anything(), {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
  })

  it('does not demote when another lot remains', async () => {
    const updates: unknown[] = []
    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        return chain(
          {
            data: { ...deal, tender_id: 'tender-1' },
            error: null,
            count: 2,
          },
          { updates },
        )
      }
      throw new Error(table)
    })
    const result = await detachDealFromTender({ from } as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
    })
    expect(result.success).toBe(true)
    expect(demoteTenderDocumentsToDeal).not.toHaveBeenCalled()
    expect(demoteTenderDeadlinesToDeal).not.toHaveBeenCalled()
    expect(updates).toContainEqual({ tender_id: null, lot_priority: null })
  })
})
