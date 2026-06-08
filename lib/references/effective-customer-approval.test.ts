import { describe, expect, it } from 'vitest'
import {
  effectiveCustomerApprovalStatus,
  hasActiveCustomerApprovalWorkflow,
} from './effective-customer-approval'

describe('effectiveCustomerApprovalStatus', () => {
  it('maps legacy external to approved', () => {
    expect(effectiveCustomerApprovalStatus(null, 'external')).toBe('approved')
  })

  it('keeps explicit pending', () => {
    expect(effectiveCustomerApprovalStatus('pending', 'external')).toBe('pending')
  })
})

describe('hasActiveCustomerApprovalWorkflow', () => {
  it('allows link renewal for legacy external', () => {
    expect(hasActiveCustomerApprovalWorkflow(null, 'external')).toBe(true)
  })
})
