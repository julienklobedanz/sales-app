import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const revalidateTenderSurfaces = vi.fn()
vi.mock('./revalidate-tender-surfaces', () => ({
  revalidateTenderSurfaces: (...args: unknown[]) => revalidateTenderSurfaces(...args),
}))

import {
  parseLotPriorityOrder,
  setTenderLotPriorities,
} from './set-tender-lot-priorities'

function chain(result: unknown, record?: { updates: unknown[] }) {
  const self = {
    select: () => self,
    update: (payload: unknown) => {
      record?.updates.push(payload)
      return self
    },
    eq: () => self,
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return self
}

describe('parseLotPriorityOrder', () => {
  it('akzeptiert die volle Permutation', () => {
    expect(parseLotPriorityOrder(['b', 'a'], ['a', 'b'])).toEqual({ ok: true })
  })

  it('lehnt fremde und unvollständige IDs ab', () => {
    expect(parseLotPriorityOrder(['a', 'c'], ['a', 'b']).ok).toBe(false)
    expect(parseLotPriorityOrder(['a'], ['a', 'b']).ok).toBe(false)
    expect(parseLotPriorityOrder(['a', 'a'], ['a', 'b']).ok).toBe(false)
  })
})

describe('setTenderLotPriorities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    revalidateTenderSurfaces.mockResolvedValue(undefined)
  })

  it('schreibt Null-Reset, dann 1..n', async () => {
    const updates: unknown[] = []
    const from = vi.fn(() =>
      chain({ data: [{ id: 'a' }, { id: 'b' }], error: null }, { updates }),
    )
    const result = await setTenderLotPriorities({ from } as never, {
      organizationId: 'org-1',
      tenderId: 'tender-1',
      orderedDealIds: ['b', 'a'],
    })
    expect(result).toEqual({ success: true })
    expect(updates).toEqual([
      { lot_priority: null },
      { lot_priority: 1 },
      { lot_priority: 2 },
    ])
    expect(revalidateTenderSurfaces).toHaveBeenCalled()
  })

  it('schreibt nicht bei fremden IDs', async () => {
    const updates: unknown[] = []
    const from = vi.fn(() =>
      chain({ data: [{ id: 'a' }, { id: 'b' }], error: null }, { updates }),
    )
    const result = await setTenderLotPriorities({ from } as never, {
      organizationId: 'org-1',
      tenderId: 'tender-1',
      orderedDealIds: ['a', 'c'],
    })
    expect(result.success).toBe(false)
    expect(updates).toEqual([])
  })
})
