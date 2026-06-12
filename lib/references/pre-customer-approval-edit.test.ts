import { describe, expect, it } from 'vitest'

import {
  canEditInternalApprovalCoordinator,
  canEditPreCustomerApprovalRecipient,
} from './pre-customer-approval-edit'

describe('pre-customer-approval-edit', () => {
  it('allows customer recipient edit before customer workflow starts', () => {
    expect(
      canEditPreCustomerApprovalRecipient({
        customerApprovalStatus: null,
        approvalRequestedAt: '2026-01-01T00:00:00Z',
        internalApprovalStatus: 'pending_internal',
      })
    ).toBe(true)
    expect(
      canEditPreCustomerApprovalRecipient({
        customerApprovalStatus: null,
        approvalRequestedAt: '2026-01-01T00:00:00Z',
        internalApprovalStatus: 'approved_internal',
      })
    ).toBe(true)
  })

  it('blocks customer recipient edit after customer pending', () => {
    expect(
      canEditPreCustomerApprovalRecipient({
        customerApprovalStatus: 'pending',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
        internalApprovalStatus: 'approved_internal',
      })
    ).toBe(false)
  })

  it('allows coordinator edit only while internal review pending', () => {
    expect(
      canEditInternalApprovalCoordinator({
        approvalRequestedAt: '2026-01-01T00:00:00Z',
        internalApprovalStatus: 'pending_internal',
      })
    ).toBe(true)
    expect(
      canEditInternalApprovalCoordinator({
        approvalRequestedAt: '2026-01-01T00:00:00Z',
        internalApprovalStatus: 'approved_internal',
      })
    ).toBe(false)
  })
})
