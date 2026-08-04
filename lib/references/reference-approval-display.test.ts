import { describe, expect, it } from 'vitest'

import {
  getReferenceApprovalExplanation,
  resolveCustomerWorkflowBadge,
  resolveFreigabestatusCardBadges,
  resolveInternalWorkflowBadge,
  resolvePostCustomerApprovalTitleBadge,
  resolvePortfolioTitleBadge,
  resolveReferenceTitleBadge,
  resolveWorkflowStatusBadges,
} from './reference-approval-display'
import { resolveReferenceReadinessState } from './reference-readiness-state'

describe('reference-approval-display', () => {
  it('title badge stays Intern during internal review on internal_only', () => {
    expect(
      resolveReferenceTitleBadge({
        referenceStatus: 'internal_only',
        internalApprovalStatus: 'pending_internal',
        customerApprovalStatus: null,
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      }).label,
    ).toBe('Intern')
  })

  it('title badge stays Intern while waiting for customer', () => {
    expect(
      resolveReferenceTitleBadge({
        referenceStatus: 'internal_only',
        internalApprovalStatus: 'approved_internal',
        customerApprovalStatus: 'pending',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      }).label,
    ).toBe('Intern')
  })

  it('title badge shows Extern freigegeben after named customer approval', () => {
    expect(
      resolveReferenceTitleBadge({
        referenceStatus: 'external',
        internalApprovalStatus: 'approved_internal',
        customerApprovalStatus: 'approved',
        approvalScopeNamedMention: true,
        approvalScopeAnonymousMention: false,
      }).label,
    ).toBe('Extern freigegeben')
  })

  it('title badge shows Anonymisiert after anonymous-only customer approval', () => {
    expect(
      resolveReferenceTitleBadge({
        referenceStatus: 'external',
        customerApprovalStatus: 'approved',
        approvalScopeNamedMention: false,
        approvalScopeAnonymousMention: true,
      }).label,
    ).toBe('Anonymisiert')
  })

  it('post-customer badge helpers', () => {
    expect(
      resolvePostCustomerApprovalTitleBadge({
        approvalScopeNamedMention: true,
        approvalScopeAnonymousMention: false,
      }).label,
    ).toBe('Extern freigegeben')
    expect(
      resolvePostCustomerApprovalTitleBadge({
        approvalScopeNamedMention: false,
        approvalScopeAnonymousMention: true,
      }).label,
    ).toBe('Anonymisiert')
  })

  it('portfolio title badge for internal_only', () => {
    expect(resolvePortfolioTitleBadge('internal_only').label).toBe('Intern')
  })

  it('title badge shows revoked by customer', () => {
    expect(
      resolveReferenceTitleBadge({
        referenceStatus: 'draft',
        internalApprovalStatus: 'pending_internal',
        customerApprovalStatus: 'revoked_by_customer',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      }).label,
    ).toBe('Gesperrt')
  })

  it('card badges default to Noch nicht gestartet before workflow', () => {
    const badges = resolveFreigabestatusCardBadges({
      internalApprovalStatus: 'pending_internal',
      customerApprovalStatus: null,
      referenceStatus: 'draft',
      approvalRequestedAt: null,
    })
    expect(badges.internal.label).toBe('Noch nicht gestartet')
    expect(badges.customer.label).toBe('Noch nicht gestartet')
  })

  it('title badge shows Entwurf for legacy withdrawn without active workflow', () => {
    expect(
      resolveReferenceTitleBadge({
        referenceStatus: 'draft',
        internalApprovalStatus: 'withdrawn_internal',
        customerApprovalStatus: null,
        approvalRequestedAt: null,
      }).label,
    ).toBe('Entwurf')
  })

  it('workflow badges for internal_start (Freigabestatus card unchanged)', () => {
    const badges = resolveWorkflowStatusBadges({
      internalApprovalStatus: 'pending_internal',
      customerApprovalStatus: null,
      referenceStatus: 'internal_only',
      approvalRequestedAt: '2026-01-01T00:00:00Z',
    })
    expect(badges?.internal.label).toBe('Interne Prüfung ausstehend')
    expect(badges?.customer?.label).toBe('Noch nicht gestartet')
  })

  it('customer workflow badge after approval with ref calls', () => {
    expect(
      resolveCustomerWorkflowBadge({
        internalApprovalStatus: 'approved_internal',
        customerApprovalStatus: 'approved',
        referenceStatus: 'external',
        approvalScopeReferenceCall: true,
      })?.label,
    ).toBe('Freigabe mit Ref. Calls')
  })

  it('internal rejected badge', () => {
    expect(resolveInternalWorkflowBadge('rejected_internal').label).toBe(
      'Intern abgelehnt',
    )
  })

  it('explanation for internal_only during workflow points to Freigabestatus card', () => {
    expect(
      getReferenceApprovalExplanation({
        referenceStatus: 'internal_only',
        internalApprovalStatus: 'pending_internal',
        approvalRequestedAt: '2026-01-01T00:00:00Z',
      }),
    ).toContain('Freigabestatus-Card')
  })

  it('readiness state aligns with internal rejected', () => {
    const state = resolveReferenceReadinessState({
      referenceStatus: 'draft',
      internalApprovalStatus: 'rejected_internal',
      customerApprovalStatus: null,
      approvalRequestedAt: '2026-01-01T00:00:00Z',
      staleInternalPending: false,
      isApprovalGranted: false,
      canStartApproval: true,
      canInternalApprove: false,
      approvalScopeNamedMention: true,
      approvalScopeAnonymousMention: true,
      approvalScopeReferenceCall: false,
      referenceIsInternalOnly: false,
    })
    expect(state.phase).toBe('rejected')
    expect(state.badge.label).toBe('Intern abgelehnt')
  })
})
