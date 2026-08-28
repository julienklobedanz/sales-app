import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildRfpDeadlineSourceKey } from '@/lib/deals/deadline-source-key'
import { syncRfpDeadlinesFromTimeline } from '@/lib/deals/deadlines'
import type { DealDeskTimelineItem } from '@/lib/deal-desk/deal-analysis-types'

const submission: DealDeskTimelineItem[] = [
  { id: 'a', title: 'Angebotsabgabe', dueDate: '2026-06-20', evidence: null },
]

function clientWithDeal(tenderId: string | null, rpc: ReturnType<typeof vi.fn>) {
  return {
    from: (table: string) => {
      if (table !== 'deals') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { tender_id: tenderId }, error: null }),
            }),
          }),
        }),
      }
    },
    rpc,
  }
}

describe('syncRfpDeadlinesFromTimeline owner', () => {
  it('writes to the lot when tender_id is null', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const result = await syncRfpDeadlinesFromTimeline(
      clientWithDeal(null, rpc) as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        timelineItems: submission,
      },
    )
    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0]![0]).toBe('upsert_deal_rfp_deadline')
    expect(rpc.mock.calls[0]![1]).toMatchObject({
      p_deal_id: 'deal-1',
      p_source_key: buildRfpDeadlineSourceKey('deal-1', 'submission'),
    })
  })

  it('writes to the tender when the lot is assigned', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const result = await syncRfpDeadlinesFromTimeline(
      clientWithDeal('tender-1', rpc) as never,
      {
        dealId: 'deal-1',
        organizationId: 'org-1',
        timelineItems: submission,
      },
    )
    expect(result.tenderId).toBe('tender-1')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0]![0]).toBe('upsert_tender_rfp_deadline')
    expect(rpc.mock.calls[0]![1]).toMatchObject({
      p_tender_id: 'tender-1',
      p_source_key: buildRfpDeadlineSourceKey('tender-1', 'submission'),
    })
  })
})
