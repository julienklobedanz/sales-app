import { effectiveCustomerApprovalStatus } from '@/lib/references/effective-customer-approval'

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

export type ReadinessBadge = {
  label: string
  className: string
}

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

function approvedScopeBadge(input: ReferenceReadinessStateInput): ReadinessBadge {
  const named = input.approvalScopeNamedMention ?? true
  const anonymous = input.approvalScopeAnonymousMention ?? true
  const refCall = input.approvalScopeReferenceCall ?? false
  const confidential = input.approvalScopeConfidentialSales ?? false
  const publicMarketing = input.approvalScopeLogoUse ?? false

  if (input.referenceIsInternalOnly) {
    return {
      label: 'Nur intern nutzbar',
      className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    }
  }

  if (!named && anonymous) {
    return {
      label: 'Anonym freigegeben',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    }
  }

  if (refCall && named) {
    return {
      label: 'Freigabe mit Ref. Calls',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    }
  }

  if (confidential && !publicMarketing && named) {
    return {
      label: 'Freigabe ohne Ref. Calls',
      className: 'border-sky-200 bg-sky-50 text-sky-900',
    }
  }

  if (publicMarketing && named) {
    return {
      label: 'Vollständig freigegeben',
      className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    }
  }

  if (named) {
    return {
      label: 'Namentlich freigegeben',
      className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    }
  }

  return {
    label: 'Freigegeben',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
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
            className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
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

  if (internal === 'withdrawn_internal') {
    return {
      phase: 'withdrawn',
      badge: {
        label: 'Anfrage widerrufen',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      },
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
        className: 'border-red-200 bg-red-50 text-red-700',
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
        className: 'border-amber-200 bg-amber-50 text-amber-900',
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

  const workflowStarted = Boolean(input.approvalRequestedAt?.trim())

  if (internal === 'pending_internal' && workflowStarted) {
    return {
      phase: 'internal_start',
      badge: {
        label: 'Interne Freigabe ausstehend',
        className: 'border-sky-200 bg-sky-50 text-sky-800',
      },
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
      badge: {
        label: 'Intern freigegeben',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      },
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
      badge: {
        label: 'Entwurf',
        className: 'border-slate-200 bg-slate-100 text-slate-700',
      },
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
      badge: {
        label: 'Nur intern',
        className: 'border-slate-200 bg-slate-100 text-slate-700',
      },
      showPrimaryStart: true,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
      showStaleHint: false,
    }
  }

  return {
    phase: 'idle',
    badge: {
      label: 'Nicht angefragt',
      className: 'border-slate-200 bg-slate-100 text-slate-600',
    },
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

export type WorkflowStatusBadge = ReadinessBadge

/** Getrennte Anzeige Intern vs. Kunde in der Freigabestatus-Card. */
export function resolveWorkflowStatusBadges(input: {
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  referenceStatus?: string | null
  approvalRequestedAt: string | null
  approvalScopeNamedMention?: boolean | null
  approvalScopeAnonymousMention?: boolean | null
  approvalScopeReferenceCall?: boolean | null
  approvalScopeConfidentialSales?: boolean | null
  approvalScopeLogoUse?: boolean | null
  referenceIsInternalOnly?: boolean
}): { internal: WorkflowStatusBadge; customer: WorkflowStatusBadge | null } | null {
  if (!input.approvalRequestedAt?.trim()) return null

  const internal = input.internalApprovalStatus.toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus
  )
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()

  let internalBadge: WorkflowStatusBadge
  switch (internal) {
    case 'approved_internal':
      internalBadge = {
        label: 'Intern freigegeben',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      }
      break
    case 'rejected_internal':
      internalBadge = {
        label: 'Intern abgelehnt',
        className: 'border-red-200 bg-red-50 text-red-700',
      }
      break
    case 'withdrawn_internal':
      internalBadge = {
        label: 'Widerrufen',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      }
      break
    default:
      internalBadge = {
        label: 'Interne Prüfung ausstehend',
        className: 'border-sky-200 bg-sky-50 text-sky-800',
      }
  }

  let customerBadge: WorkflowStatusBadge | null = null
  if (customer === 'pending') {
    customerBadge = {
      label: 'Wartet auf Kundenfreigabe',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    }
  } else if (customer === 'approved') {
    customerBadge = approvedScopeBadge({
      referenceStatus: input.referenceStatus ?? 'external',
      internalApprovalStatus: internal,
      customerApprovalStatus: 'approved',
      approvalRequestedAt: input.approvalRequestedAt,
      staleInternalPending: false,
      isApprovalGranted: true,
      canStartApproval: false,
      canInternalApprove: false,
      approvalScopeNamedMention: input.approvalScopeNamedMention ?? null,
      approvalScopeAnonymousMention: input.approvalScopeAnonymousMention ?? null,
      approvalScopeReferenceCall: input.approvalScopeReferenceCall ?? null,
      approvalScopeConfidentialSales: input.approvalScopeConfidentialSales ?? null,
      approvalScopeLogoUse: input.approvalScopeLogoUse ?? null,
      referenceIsInternalOnly: input.referenceIsInternalOnly ?? false,
    })
  } else if (customer === 'rejected' || customerRaw === 'rejected') {
    customerBadge = {
      label: 'Vom Kunden abgelehnt',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  } else if (customer === 'expired' || customerRaw === 'expired') {
    customerBadge = {
      label: 'Kundenfrist abgelaufen',
      className: 'border-orange-200 bg-orange-50 text-orange-800',
    }
  } else if (internal !== 'withdrawn_internal' && internal !== 'rejected_internal') {
    customerBadge = {
      label: 'Noch nicht gestartet',
      className: 'border-slate-200 bg-slate-100 text-slate-600',
    }
  }

  return { internal: internalBadge, customer: customerBadge }
}
