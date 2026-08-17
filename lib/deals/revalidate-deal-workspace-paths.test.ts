import { revalidatePath } from 'next/cache'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { DEAL_WORKSPACE_AREA_IDS } from './deal-workspace-areas'
import { dealWorkspaceAreaHref, dealWorkspaceHref } from './deal-workspace-href'
import { revalidateDealWorkspacePaths } from './revalidate-deal-workspace-paths'
import { ROUTES } from '@/lib/routes'

describe('revalidateDealWorkspacePaths', () => {
  it('ohne Bereich: Deal-Seite, Root und alle sieben Flächen', () => {
    revalidateDealWorkspacePaths('deal-1')
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.deals.detail('deal-1'), 'page')
    expect(revalidatePath).toHaveBeenCalledWith(dealWorkspaceHref('deal-1'), 'page')
    for (const area of DEAL_WORKSPACE_AREA_IDS) {
      expect(revalidatePath).toHaveBeenCalledWith(
        dealWorkspaceAreaHref('deal-1', area),
        'page',
      )
    }
  })

  it('mit Bereich: trifft die Area-Route, nicht nur detail', () => {
    vi.mocked(revalidatePath).mockClear()
    revalidateDealWorkspacePaths('deal-1', 'entwuerfe')
    expect(revalidatePath).toHaveBeenCalledWith(ROUTES.deals.detail('deal-1'), 'page')
    expect(revalidatePath).toHaveBeenCalledWith(dealWorkspaceHref('deal-1'), 'page')
    expect(revalidatePath).toHaveBeenCalledWith(
      dealWorkspaceAreaHref('deal-1', 'entwuerfe'),
      'page',
    )
    expect(revalidatePath).not.toHaveBeenCalledWith(
      dealWorkspaceAreaHref('deal-1', 'stammdaten'),
      'page',
    )
  })

  it('Dokumente treffen /dokumente', () => {
    vi.mocked(revalidatePath).mockClear()
    revalidateDealWorkspacePaths('deal-1', 'dokumente')
    expect(revalidatePath).toHaveBeenCalledWith(
      dealWorkspaceAreaHref('deal-1', 'dokumente'),
      'page',
    )
  })
})
