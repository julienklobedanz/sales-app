/** Ob der Freigabe-Workflow neu gestartet werden darf (nur von der Referenz-Detailseite). */

export function canStartApprovalWorkflow(params: {
  role: 'admin' | 'sales' | 'account_manager'
  referenceStatus: string
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  /** Gesetzt, sobald „Freigabe starten“ / Anfrage eingereicht wurde */
  approvalRequestedAt?: string | null
  staleInternalPending: boolean
  isApprovalGranted: boolean
}): boolean {
  if (params.isApprovalGranted || params.staleInternalPending) return false

  const internal = params.internalApprovalStatus.toLowerCase()
  const customer = String(params.customerApprovalStatus ?? '').toLowerCase()
  const workflowStarted = Boolean(params.approvalRequestedAt?.trim())

  if (internal === 'pending_internal' && workflowStarted) return false
  if (customer === 'pending') return false

  const status = params.referenceStatus.toLowerCase()

  if (params.role === 'sales') {
    return status === 'internal_only' || status === 'internal'
  }

  if (params.role === 'admin' || params.role === 'account_manager') {
    return status === 'draft'
  }

  return false
}
