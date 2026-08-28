import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const promoteActiveRfpDeadlinesToTender = vi.fn()
const demoteTenderDeadlinesToDeal = vi.fn()
const revalidateTenderSurfaces = vi.fn()

vi.mock('./move-deadlines', () => ({
  promoteActiveRfpDeadlinesToTender: (...args: unknown[]) =>
    promoteActiveRfpDeadlinesToTender(...args),
  demoteTenderDeadlinesToDeal: (...args: unknown[]) =>
    demoteTenderDeadlinesToDeal(...args),
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

function chain(result: unknown) {
  const self = {
    select: () => self,
    insert: () => self,
    update: () => self,
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
})

describe('detachDealFromTender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    demoteTenderDeadlinesToDeal.mockResolvedValue({ success: true })
    revalidateTenderSurfaces.mockResolvedValue(undefined)
  })

  it('demotes deadlines before deleting the last-lot tender', async () => {
    const order: string[] = []
    demoteTenderDeadlinesToDeal.mockImplementation(async () => {
      order.push('demote')
      return { success: true }
    })
    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        return chain({
          data: { ...deal, tender_id: 'tender-1' },
          error: null,
          count: 1,
        })
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
    expect(order).toEqual(['demote', 'delete'])
    expect(demoteTenderDeadlinesToDeal).toHaveBeenCalledWith(expect.anything(), {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
  })

  it('does not demote when another lot remains', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        return chain({
          data: { ...deal, tender_id: 'tender-1' },
          error: null,
          count: 2,
        })
      }
      throw new Error(table)
    })
    const result = await detachDealFromTender({ from } as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
    })
    expect(result.success).toBe(true)
    expect(demoteTenderDeadlinesToDeal).not.toHaveBeenCalled()
  })
})
