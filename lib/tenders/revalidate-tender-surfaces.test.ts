import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/deals/revalidate-deal-workspace-paths', () => ({
  revalidateDealWorkspacePaths: vi.fn(),
}))

import { revalidatePath } from 'next/cache'
import { revalidateDealWorkspacePaths } from '@/lib/deals/revalidate-deal-workspace-paths'
import { ROUTES } from '@/lib/routes'
import { revalidateTenderSurfaces } from './revalidate-tender-surfaces'

describe('revalidateTenderSurfaces', () => {
  it('revalidates list, tender page and sibling lots', async () => {
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () =>
            Promise.resolve({
              data: [{ id: 'deal-1' }, { id: 'deal-2' }],
              error: null,
            }),
        }),
      }),
    }))
    await revalidateTenderSurfaces({ from } as never, {
      organizationId: 'org-1',
      tenderId: 'tender-1',
      extraDealId: 'deal-1',
    })
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.deals.root)
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.tenders.detail('tender-1'), 'page')
    expect(revalidateDealWorkspacePaths).toHaveBeenCalledWith('deal-1')
    expect(revalidateDealWorkspacePaths).toHaveBeenCalledWith('deal-2')
  })
})
