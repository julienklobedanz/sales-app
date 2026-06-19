import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import { isSalesAppView } from '@/lib/roles/reference-access'

/** Ob der Freigabe-Workflow neu gestartet werden darf (nur von der Referenz-Detailseite). */

export function canStartApprovalWorkflow(params: {
  systemRole: SystemRole
  functionRole: FunctionRole
  referenceStatus: string
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  /** Gesetzt, sobald „Freigabe starten“ / Anfrage eingereicht wurde */
  approvalRequestedAt?: string | null
  staleInternalPending: boolean
  isApprovalGranted: boolean
}): boolean {
  const internal = params.internalApprovalStatus.toLowerCase()
  const customer = String(params.customerApprovalStatus ?? '').toLowerCase()

  if (internal === 'withdrawn_internal') {
    if (customer === 'pending') return false
    if (isSalesAppView(params.systemRole, params.functionRole)) {
      const status = params.referenceStatus.toLowerCase()
      return status === 'internal_only' || status === 'internal'
    }
    if (isSystemAdmin(params.systemRole) || params.functionRole === 'account_manager') {
      return true
    }
    return false
  }

  if (params.isApprovalGranted || params.staleInternalPending) return false

  const workflowStarted = Boolean(params.approvalRequestedAt?.trim())

  if (internal === 'pending_internal' && workflowStarted) return false
  if (customer === 'pending') return false

  const status = params.referenceStatus.toLowerCase()

  if (isSalesAppView(params.systemRole, params.functionRole)) {
    return status === 'internal_only' || status === 'internal'
  }

  if (isSystemAdmin(params.systemRole) || params.functionRole === 'account_manager') {
    return status === 'draft' || status === 'internal_only' || status === 'internal'
  }

  return false
}
