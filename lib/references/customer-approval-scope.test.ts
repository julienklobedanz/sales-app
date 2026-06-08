import { describe, expect, it } from 'vitest'
import {
  customerApprovalScopeFromDb,
  customerApprovalScopeToDbPatch,
  defaultCustomerApprovalScope,
  resetNamedSubOptions,
} from './customer-approval-scope'

describe('customerApprovalScopeFromDb', () => {
  it('reconstructs named scope from db columns', () => {
    expect(
      customerApprovalScopeFromDb({
        approval_scope_named_mention: true,
        approval_scope_anonymous_mention: false,
        approval_scope_logo_use: true,
        approval_scope_press_release: false,
        approval_scope_reference_call: true,
        approval_scope_confidential_sales: true,
        approval_reference_call_frequency: 'twice_yearly',
      })
    ).toEqual({
      approvalType: 'named',
      namentlichPublic: true,
      namentlichConfidential: true,
      referenceCallsEnabled: true,
      referenceCallFrequency: 'twice_yearly',
    })
  })
})

describe('customerApprovalScopeToDbPatch', () => {
  it('maps named scope with sub-options', () => {
    expect(
      customerApprovalScopeToDbPatch({
        ...defaultCustomerApprovalScope('named'),
        namentlichPublic: true,
        namentlichConfidential: true,
        referenceCallsEnabled: true,
        referenceCallFrequency: 'quarterly',
      })
    ).toEqual({
      approval_scope_named_mention: true,
      approval_scope_anonymous_mention: false,
      approval_scope_logo_use: true,
      approval_scope_press_release: true,
      approval_scope_reference_call: true,
      approval_scope_confidential_sales: true,
      approval_reference_call_frequency: 'quarterly',
    })
  })

  it('clears sub-options for anonymous', () => {
    const cleared = resetNamedSubOptions({
      approvalType: 'anonymous',
      namentlichPublic: true,
      namentlichConfidential: true,
      referenceCallsEnabled: true,
      referenceCallFrequency: 'twice_yearly',
    })
    expect(cleared.namentlichPublic).toBe(false)
    expect(cleared.referenceCallsEnabled).toBe(false)
    expect(
      customerApprovalScopeToDbPatch(cleared).approval_scope_anonymous_mention
    ).toBe(true)
  })
})
