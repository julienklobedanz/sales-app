import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  assignSubmissionItemsToDeadline,
  cycleSubmissionItemState,
  setSubmissionItemReview,
} from '@/lib/deals/submission-item-mutations'

describe('submission item mutations', () => {
  it('cycles state without writing deadline_id', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    })
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'item-1', state: 'open' }, error: null }),
            }),
          }),
        }),
        update: updateFn,
      }),
    }

    const result = await cycleSubmissionItemState(supabase as never, {
      organizationId: 'org-1',
      itemId: 'item-1',
      userId: 'user-1',
    })
    expect(result).toEqual({ success: true })
    const patch = updateFn.mock.calls[0]![0] as Record<string, unknown>
    expect(patch).not.toHaveProperty('deadline_id')
    expect(patch.state).toBe('provided')
  })

  it('review update does not write deadline_id', async () => {
    const update = vi.fn().mockReturnValue({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    })
    const supabase = { from: () => ({ update }) }
    const result = await setSubmissionItemReview(supabase as never, {
      organizationId: 'org-1',
      itemId: 'item-1',
      userId: 'user-1',
      review: 'confirmed',
    })
    expect(result).toEqual({ success: true })
    expect(update.mock.calls[0]![0]).not.toHaveProperty('deadline_id')
    expect(update.mock.calls[0]![0]).toMatchObject({ review: 'confirmed' })
  })

  it('assign only updates unassigned rows', async () => {
    const is = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({
      in: () => ({ eq: () => ({ is }) }),
    })
    const supabase = {
      from: (table: string) => {
        if (table === 'deal_deadlines') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      maybeSingle: () =>
                        Promise.resolve({ data: { id: 'deadline-1' }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return { update }
      },
    }
    const result = await assignSubmissionItemsToDeadline(supabase as never, {
      organizationId: 'org-1',
      owner: { kind: 'deal', id: 'deal-1' },
      itemIds: ['a', 'b'],
      deadlineId: 'deadline-1',
    })
    expect(result).toEqual({ success: true })
    expect(update.mock.calls[0]![0]).toMatchObject({ deadline_id: 'deadline-1' })
    expect(update.mock.calls[0]![0]).not.toHaveProperty('review')
    expect(update.mock.calls[0]![0]).not.toHaveProperty('state')
  })
})
