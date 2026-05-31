/** UI-Zustände der Reference-Readiness-Card (Detailansicht). */

export type ReferenceReadinessPhase =
  | 'request_approval'
  | 'internal_start'
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
      label: 'Bereit für Ref. Calls',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    }
  }

  if (named && !refCall) {
    return {
      label: 'Freigabe ohne Ref. Call',
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
  const customer = String(input.customerApprovalStatus ?? '').toLowerCase()
  const status = input.referenceStatus.toLowerCase()

  if (input.staleInternalPending) {
    return {
      phase: 'approved',
      badge: approvedScopeBadge(input),
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

  if (customer === 'rejected') {
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

  if (customer === 'expired') {
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
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: true,
      showStaleHint: false,
    }
  }

  if (
    input.isApprovalGranted ||
    customer === 'approved' ||
    status === 'external' ||
    status === 'approved'
  ) {
    return {
      phase: 'approved',
      badge: approvedScopeBadge(input),
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
      showPrimaryStart: input.canInternalApprove,
      showMagicLink: false,
      showRegenerateLink: false,
      showWithdraw: false,
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
