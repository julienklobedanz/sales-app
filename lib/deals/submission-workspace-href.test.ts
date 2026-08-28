import { describe, expect, it } from 'vitest'

import { DEAL_WORKSPACE_AREA_IDS } from '@/lib/deals/deal-workspace-areas'
import { ROUTES } from '@/lib/routes'
import {
  redirectToSelectedSubmission,
  submissionWorkspaceDeadlineHref,
  submissionWorkspaceHref,
} from '@/lib/deals/submission-workspace-href'

describe('submission workspace hrefs', () => {
  it('builds object subroutes, not a deal-workspace area', () => {
    expect(submissionWorkspaceHref({ kind: 'tender', id: 't1' })).toBe(
      ROUTES.tenders.submission('t1'),
    )
    expect(submissionWorkspaceHref({ kind: 'deal', id: 'd1' })).toBe(
      ROUTES.deals.submission('d1'),
    )
    expect(submissionWorkspaceDeadlineHref({ kind: 'tender', id: 't1' }, 'dl-1')).toBe(
      '/ausschreibungen/t1/einreichung/dl-1',
    )
    expect(DEAL_WORKSPACE_AREA_IDS).not.toContain('einreichung')
  })

  it('sends an unknown deadline to the first marked Abgabe, not the index', () => {
    const owner = { kind: 'tender' as const, id: 't1' }
    expect(redirectToSelectedSubmission(owner, ['dl-1'], null)).toBe(
      '/ausschreibungen/t1/einreichung/dl-1',
    )
    expect(redirectToSelectedSubmission(owner, ['dl-1'], 'dl-1')).toBeNull()
    expect(redirectToSelectedSubmission(owner, ['dl-1'], 'other')).toBe(
      '/ausschreibungen/t1/einreichung/dl-1',
    )
    expect(redirectToSelectedSubmission(owner, [], 'dl-1')).toBeNull()
  })
})
