import { revalidatePath } from 'next/cache'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { dealWorkspaceHref } from './deal-workspace-href'
import { revalidateDealWorkspacePaths } from './revalidate-deal-workspace-paths'
import { ROUTES } from '@/lib/routes'

describe('revalidateDealWorkspacePaths', () => {
  it('revalidiert Deal-Seite und Unterroute, nicht nur detail', () => {
    revalidateDealWorkspacePaths('deal-1')
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.deals.detail('deal-1'), 'page')
    expect(revalidatePath).toHaveBeenCalledWith(dealWorkspaceHref('deal-1'), 'page')
  })
})
