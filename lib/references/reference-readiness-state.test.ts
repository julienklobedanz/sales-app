import { describe, expect, it } from 'vitest'
import { resolveReferenceReadinessState } from './reference-readiness-state'

const base = {
  referenceStatus: 'draft',
  internalApprovalStatus: 'pending_internal',
  customerApprovalStatus: null,
  approvalRequestedAt: null,
  staleInternalPending: false,
  isApprovalGranted: false,
  canStartApproval: true,
  canInternalApprove: true,
  approvalScopeNamedMention: true,
  approvalScopeAnonymousMention: true,
  approvalScopeReferenceCall: false,
  referenceIsInternalOnly: false,
}

describe('resolveReferenceReadinessState', () => {
  it('draft with can start → request_approval only', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      internalApprovalStatus: 'approved_internal',
      customerApprovalStatus: null,
    })
    expect(s.phase).toBe('request_approval')
    expect(s.showPrimaryStart).toBe(true)
    expect(s.showMagicLink).toBe(false)
    expect(s.showWithdraw).toBe(false)
  })

  it('pending internal → internal_start', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      internalApprovalStatus: 'pending_internal',
      approvalRequestedAt: '2026-01-01T00:00:00Z',
    })
    expect(s.phase).toBe('internal_start')
    expect(s.showMagicLink).toBe(false)
    expect(s.showWithdraw).toBe(false)
  })

  it('customer pending → amber withdraw only', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      internalApprovalStatus: 'approved_internal',
      customerApprovalStatus: 'pending',
    })
    expect(s.phase).toBe('pending_customer')
    expect(s.badge.label).toBe('Wartet auf Kundenfreigabe')
    expect(s.showPrimaryStart).toBe(false)
    expect(s.showMagicLink).toBe(true)
    expect(s.showWithdraw).toBe(true)
  })

  it('external without customer approval → extern nutzbar badge', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      internalApprovalStatus: 'approved_internal',
      customerApprovalStatus: null,
      isApprovalGranted: true,
    })
    expect(s.phase).toBe('approved')
    expect(s.badge.label).toBe('Extern nutzbar')
  })

  it('approved with public scope → Vollständig freigegeben', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      customerApprovalStatus: 'approved',
      isApprovalGranted: true,
      approvalScopeLogoUse: true,
    })
    expect(s.badge.label).toBe('Vollständig freigegeben')
  })

  it('approved with confidential scope → Freigabe ohne Ref. Calls', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      customerApprovalStatus: 'approved',
      isApprovalGranted: true,
      approvalScopeConfidentialSales: true,
      approvalScopeLogoUse: false,
    })
    expect(s.badge.label).toBe('Freigabe ohne Ref. Calls')
  })

  it('approved with ref call scope', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      customerApprovalStatus: 'approved',
      isApprovalGranted: true,
      approvalScopeReferenceCall: true,
    })
    expect(s.phase).toBe('approved')
    expect(s.badge.label).toBe('Freigabe mit Ref. Calls')
    expect(s.showMagicLink).toBe(true)
  })

  it('anonymous only scope', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      customerApprovalStatus: 'approved',
      isApprovalGranted: true,
      approvalScopeNamedMention: false,
      approvalScopeAnonymousMention: true,
    })
    expect(s.badge.label).toBe('Anonym freigegeben')
    expect(s.badge.className).toContain('amber')
  })
})
