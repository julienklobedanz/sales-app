import {
  getReferenceApprovalExplanation,
  type ReferenceTitleBadgeInput,
} from '@/lib/references/reference-approval-display'

/**
 * Kurzer Hilfetext für die Referenz-Freigabestufe (Detailansicht / Tooltips).
 */
export function getReferenceStatusExplanation(
  status: string | null | undefined,
  customerApprovalStatus?: string | null,
  approvalInternalStatus?: string | null,
  approvalRequestedAt?: string | null
): string {
  const input: ReferenceTitleBadgeInput = {
    referenceStatus: status,
    customerApprovalStatus,
    internalApprovalStatus: approvalInternalStatus,
    approvalRequestedAt,
  }
  return getReferenceApprovalExplanation(input)
}
