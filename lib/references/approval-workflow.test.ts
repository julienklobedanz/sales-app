import { describe, expect, it } from 'vitest'
import { canStartApprovalWorkflow } from './approval-workflow'

describe('canStartApprovalWorkflow', () => {
  const base = {
    staleInternalPending: false,
    isApprovalGranted: false,
    customerApprovalStatus: null as string | null,
  }

  const adminDims = {
    systemRole: 'admin' as const,
    functionRole: 'sales_leader' as const,
  }
  const salesDims = { systemRole: 'member' as const, functionRole: 'sales_rep' as const }

  it('allows admin on draft when workflow not started (DB default pending_internal)', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        ...adminDims,
        referenceStatus: 'draft',
        internalApprovalStatus: 'pending_internal',
        approvalRequestedAt: null,
      }),
    ).toBe(true)

    expect(
      canStartApprovalWorkflow({
        ...base,
        ...adminDims,
        referenceStatus: 'draft',
        internalApprovalStatus: 'pending_internal',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe(false)

    expect(
      canStartApprovalWorkflow({
        ...base,
        ...adminDims,
        referenceStatus: 'draft',
        internalApprovalStatus: 'withdrawn_internal',
      }),
    ).toBe(true)
  })

  it('allows sales on internal_only when idle', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        ...salesDims,
        referenceStatus: 'internal_only',
        internalApprovalStatus: 'approved_internal',
      }),
    ).toBe(true)
  })

  it('allows admin on internal_only when idle', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        ...adminDims,
        referenceStatus: 'internal_only',
        internalApprovalStatus: 'pending_internal',
        approvalRequestedAt: null,
      }),
    ).toBe(true)
  })

  it('allows admin to restart after withdraw even when reference status is external', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        ...adminDims,
        referenceStatus: 'external',
        internalApprovalStatus: 'withdrawn_internal',
        isApprovalGranted: false,
      }),
    ).toBe(true)
  })

  it('blocks when customer approval pending', () => {
    expect(
      canStartApprovalWorkflow({
        ...base,
        ...adminDims,
        referenceStatus: 'draft',
        internalApprovalStatus: 'approved_internal',
        customerApprovalStatus: 'pending',
      }),
    ).toBe(false)
  })
})
