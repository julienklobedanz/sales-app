import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'

export type ReferenceInternalFrameApprovalMeta = {
  requestedByDisplay: string | null
  coordinatorDisplay: string | null
  approvingCustomerDisplay: string | null
  delegatedRecipientDisplay: string | null
  customerAccessRevoked: boolean
  approvalQuoteApproved: string | null
  approvalQuoteProposed: string | null
  approvalConsentFileUrl: string | null
}

export type ReferenceInternalFrameSupplement = {
  existingSharePath: string | null
  readiness: ReferenceReadinessState
  canStartApproval: boolean
  canInternalApprove: boolean
  defaultAccountManagerEmail: string | null
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
  hasCustomerChangeRequests: boolean
  canEditCustomerEmail: boolean
  canEditCoordinatorEmail: boolean
  customerChangeRequestComment: string | null
  approvalMeta: ReferenceInternalFrameApprovalMeta
}

export function referenceApprovalMetaHasContent(
  meta: ReferenceInternalFrameApprovalMeta,
): boolean {
  const quote =
    !meta.customerAccessRevoked &&
    (meta.approvalQuoteApproved || meta.approvalQuoteProposed)
  return Boolean(
    meta.requestedByDisplay ||
      meta.coordinatorDisplay ||
      meta.approvingCustomerDisplay ||
      meta.delegatedRecipientDisplay ||
      quote ||
      meta.approvalConsentFileUrl,
  )
}
