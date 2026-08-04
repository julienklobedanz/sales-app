import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/references/approval-workflow-internal-notifications', () => ({
  notifyInternalTeamInternalApproved: vi.fn().mockResolvedValue(true),
}))

import { confirmInternalApprovalFromToken } from './complete-internal-approval'

function mockAdmin(
  row: Record<string, unknown> | null,
  updateError: Error | null = null,
) {
  const updateEq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi
    .fn()
    .mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: updateEq }) })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null })

  const from = vi.fn((table: string) => {
    if (table === 'references') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle }),
        }),
        update,
      }
    }
    if (table === 'evidence_events') {
      return { insert }
    }
    throw new Error(`unexpected table ${table}`)
  })

  return { from, update, insert, maybeSingle, updateEq }
}

describe('confirmInternalApprovalFromToken', () => {
  it('rejects empty token', async () => {
    const admin = mockAdmin(null)
    const result = await confirmInternalApprovalFromToken(admin as never, '  ')
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('approves pending internal reference', async () => {
    const admin = mockAdmin({
      id: 'ref-1',
      title: 'Test Ref',
      organization_id: 'org-1',
      approval_internal_status: 'pending_internal',
      approval_internal_review_token: 'tok-1',
    })
    const result = await confirmInternalApprovalFromToken(admin as never, 'tok-1')
    expect(result).toMatchObject({
      ok: true,
      referenceId: 'ref-1',
      referenceTitle: 'Test Ref',
      alreadyApproved: false,
    })
    expect(admin.update).toHaveBeenCalled()
    expect(admin.insert).toHaveBeenCalled()
  })

  it('returns already approved without update', async () => {
    const admin = mockAdmin({
      id: 'ref-1',
      title: 'Test Ref',
      organization_id: 'org-1',
      approval_internal_status: 'approved_internal',
      approval_internal_review_token: 'tok-1',
    })
    const result = await confirmInternalApprovalFromToken(admin as never, 'tok-1')
    expect(result).toMatchObject({ ok: true, alreadyApproved: true })
    expect(admin.update).not.toHaveBeenCalled()
  })
})
