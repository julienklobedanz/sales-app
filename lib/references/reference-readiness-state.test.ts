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

  it('pending internal → internal_start (wait for AM email)', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      internalApprovalStatus: 'pending_internal',
      approvalRequestedAt: '2026-01-01T00:00:00Z',
    })
    expect(s.phase).toBe('internal_start')
    expect(s.showPrimaryStart).toBe(false)
    expect(s.showMagicLink).toBe(false)
    expect(s.showWithdraw).toBe(true)
  })

  it('approved internal after workflow → prepare_customer', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      internalApprovalStatus: 'approved_internal',
      approvalRequestedAt: '2026-01-01T00:00:00Z',
    })
    expect(s.phase).toBe('prepare_customer')
    expect(s.badge.label).toBe('Intern freigegeben')
    expect(s.showPrimaryStart).toBe(true)
    expect(s.showMagicLink).toBe(false)
    expect(s.showWithdraw).toBe(true)
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

  it('legacy external without customer_approval_status → treated as approved', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      internalApprovalStatus: 'approved_internal',
      customerApprovalStatus: null,
      isApprovalGranted: true,
    })
    expect(s.phase).toBe('approved')
    expect(s.badge.label).toBe('Freigabe ohne Ref. Calls')
    expect(s.showMagicLink).toBe(true)
  })

  it('approved without ref calls → Freigabe ohne Ref. Calls', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'external',
      customerApprovalStatus: 'approved',
      isApprovalGranted: true,
      approvalScopeLogoUse: true,
      approvalScopeReferenceCall: false,
    })
    expect(s.badge.label).toBe('Freigabe ohne Ref. Calls')
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
    expect(s.badge.className).toContain('status-warning')
  })

  it('internal_only with can start → request_approval (no stale magic link)', () => {
    const s = resolveReferenceReadinessState({
      ...base,
      referenceStatus: 'internal_only',
      internalApprovalStatus: 'pending_internal',
      approvalRequestedAt: null,
      canStartApproval: true,
      referenceIsInternalOnly: true,
    })
    expect(s.phase).toBe('request_approval')
    expect(s.showPrimaryStart).toBe(true)
    expect(s.showMagicLink).toBe(false)
    expect(s.showStaleHint).toBe(false)
  })
})
