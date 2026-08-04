import { describe, expect, it } from 'vitest'
import { isStaleInternalPending } from './stale-internal-pending'

describe('isStaleInternalPending', () => {
  it('is false for default pending_internal on internal_only without workflow', () => {
    expect(
      isStaleInternalPending({
        internalApprovalStatus: 'pending_internal',
        customerApprovalStatus: null,
        referenceStatus: 'internal_only',
        approvalRequestedAt: null,
      }),
    ).toBe(false)
  })

  it('is true when workflow ran and customer is approved but internal still pending', () => {
    expect(
      isStaleInternalPending({
        internalApprovalStatus: 'pending_internal',
        customerApprovalStatus: 'approved',
        referenceStatus: 'external',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe(true)
  })

  it('is false when workflow never started even if status is external', () => {
    expect(
      isStaleInternalPending({
        internalApprovalStatus: 'pending_internal',
        customerApprovalStatus: null,
        referenceStatus: 'external',
        approvalRequestedAt: null,
      }),
    ).toBe(false)
  })
})
