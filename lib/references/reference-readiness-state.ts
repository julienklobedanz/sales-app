import { statusTone } from '@/lib/ui/status-tone'
import { effectiveCustomerApprovalStatus } from '@/lib/references/effective-customer-approval'
import {
  approvedScopeBadge,
  resolveInternalWorkflowBadge,
  resolvePreWorkflowCardBadge,
  type ApprovalBadge,
} from '@/lib/references/reference-approval-display'

export {
  approvedScopeBadge,
  resolveFreigabestatusCardBadges,
  resolveWorkflowStatusBadges,
  type ApprovalBadge as WorkflowStatusBadge,
} from '@/lib/references/reference-approval-display'

/** UI-Zustände der Freigabestatus-Card (Detailansicht). */

export type ReferenceReadinessPhase =
  | 'request_approval'
  | 'internal_start'
  | 'prepare_customer'
  | 'pending_customer'
  | 'approved'
  | 'withdrawn'
  | 'rejected'
  | 'expired'
  | 'idle'

export type ReadinessBadge = ApprovalBadge

export type ReferenceReadinessStateInput = {
  referenceStatus: string
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  /** Gesetzt sobald „Freigabe anfordern“ / Workflow gestartet wurde */
  approvalRequestedAt: string | null
  staleInternalPending: boolean
  isApprovalGranted: boolean
  canStartApproval: boolean
  canInternalApprove: boolean
  approvalScopeNamedMention: boolean | null
  approvalScopeAnonymousMention: boolean | null
  approvalScopeReferenceCall: boolean | null
  approvalScopeConfidentialSales?: boolean | null
  approvalScopeLogoUse?: boolean | null
  referenceIsInternalOnly: boolean
}

export type ReferenceReadinessState = {
  phase: ReferenceReadinessPhase
  badge: ReadinessBadge
  showPrimaryStart: boolean
  showMagicLink: boolean
  showRegenerateLink: boolean
  showWithdraw: boolean
  showStaleHint: boolean
}

export function resolveReferenceReadinessState(
  input: ReferenceReadinessStateInput
): ReferenceReadinessState {
  const internal = input.internalApprovalStatus.toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus
  )
  const status = input.referenceStatus.toLowerCase()

  if (input.staleInternalPending) {
    const badge =
      customer === 'approved'
        ? approvedScopeBadge(input)
        : {
            label: 'Freigegeben',
            className: statusTone.success,
          }

    return {
      phase: 'approved',
      badge,
      showPrimaryStart: false,
      showMagicLink: true,
      showRegenerateLink: true,
      showWithdraw: false,
      showStaleHint: true,
    }
  }

  const workflowStarted = Boolean(input.approvalRequestedAt?.trim())

  if (internal === 'withdrawn_internal' && workflowStarted) {
    return {
      phase: 'withdrawn',
      badge: resolveInternalWorkflowBadge(internal),
      showPrimaryStart: input.canStartApproval,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  if (customer === 'rejected' || String(input.customerApprovalStatus ?? '').toLowerCase() === 'rejected') {
    return {
      phase: 'rejected',
      badge: {
        label: 'Abgelehnt',
        className: statusTone.danger,
      },
      showPrimaryStart: input.canStartApproval,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  if (customer === 'expired' || String(input.customerApprovalStatus ?? '').toLowerCase() === 'expired') {
    return {
      phase: 'expired',
      badge: {
        label: 'Frist abgelaufen',
        className: 'border-orange-200 bg-orange-50 text-orange-800',
      },
      showPrimaryStart: input.canStartApproval,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  if (customer === 'pending') {
    return {
      phase: 'pending_customer',
      badge: {
        label: 'Wartet auf Kundenfreigabe',
        className: statusTone.warning,
      },
      showPrimaryStart: false,
      showMagicLink: true,
      showRegenerateLink: true,
      showWithdraw: true,
      showStaleHint: false,
    }
  }

  if (customer === 'approved') {
    const badge = approvedScopeBadge(input)

    return {
      phase: 'approved',
      badge,
      showPrimaryStart: false,
      showMagicLink: true,
      showRegenerateLink: true,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  if (internal === 'rejected_internal' && workflowStarted) {
    return {
      phase: 'rejected',
      badge: resolveInternalWorkflowBadge(internal),
      showPrimaryStart: input.canStartApproval,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  if (internal === 'pending_internal' && workflowStarted) {
    return {
      phase: 'internal_start',
      badge: resolveInternalWorkflowBadge(internal),
      showPrimaryStart: false,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: true,
      showStaleHint: false,
    }
  }

  if (internal === 'approved_internal' && workflowStarted) {
    return {
      phase: 'prepare_customer',
      badge: resolveInternalWorkflowBadge(internal),
      showPrimaryStart: input.canInternalApprove,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: true,
      showStaleHint: false,
    }
  }

  if (input.canStartApproval && status === 'draft') {
    return {
      phase: 'request_approval',
      badge: resolvePreWorkflowCardBadge({
        referenceStatus: status,
        canStartApproval: true,
      }),
      showPrimaryStart: true,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  if (input.canStartApproval && (status === 'internal_only' || status === 'internal')) {
    return {
      phase: 'request_approval',
      badge: resolvePreWorkflowCardBadge({
        referenceStatus: status,
        canStartApproval: true,
      }),
      showPrimaryStart: true,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  return {
    phase: 'idle',
    badge: resolvePreWorkflowCardBadge({
      referenceStatus: status,
      canStartApproval: false,
    }),
    showPrimaryStart: false,
    showMagicLink: false,
    showRegenerateLink: false,
    showWithdraw: false,
    showStaleHint: false,
  }
}

export function formatReadinessEmpty(value: string | null | undefined): string | null {
  const t = typeof value === 'string' ? value.trim() : ''
  return t.length > 0 ? t : null
}
