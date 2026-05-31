import { describe, expect, it } from 'vitest'
import { canStartApprovalWorkflow } from './approval-workflow'

describe('canStartApprovalWorkflow', () => {
  const base = {
    staleInternalPending: false,
    isApprovalGranted: false,
    customerApprovalStatus: null as string | null,
  }

  it('allows admin on draft when workflow not started (DB default pending_internal)', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        role: 'admin',
        referenceStatus: 'draft',
        internalApprovalStatus: 'pending_internal',
        approvalRequestedAt: null,
      })
    ).toBe(true)

    expect(
      canStartApprovalWorkflow({
        ...base,
        role: 'admin',
        referenceStatus: 'draft',
        internalApprovalStatus: 'pending_internal',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      })
    ).toBe(false)

    expect(
      canStartApprovalWorkflow({
        ...base,
        role: 'admin',
        referenceStatus: 'draft',
        internalApprovalStatus: 'withdrawn_internal',
      })
    ).toBe(true)
  })

  it('allows sales on internal_only when idle', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        role: 'sales',
        referenceStatus: 'internal_only',
        internalApprovalStatus: 'approved_internal',
      })
    ).toBe(true)
  })

  it('blocks when customer approval pending', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        role: 'admin',
        referenceStatus: 'draft',
        internalApprovalStatus: 'approved_internal',
        customerApprovalStatus: 'pending',
      })
    ).toBe(false)
  })
})
