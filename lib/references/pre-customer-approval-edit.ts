/** Kundenkontakt ändern, bevor die Kundenfreigabe versendet wurde. */

export function canEditPreCustomerApprovalRecipient(params: {
  customerApprovalStatus: string | null | undefined
  approvalRequestedAt: string | null | undefined
  internalApprovalStatus: string | null | undefined
}): boolean {
  if (!params.approvalRequestedAt?.trim()) return false

  const customer = String(params.customerApprovalStatus ?? '').toLowerCase()
  if (customer === 'pending' || customer === 'approved') return false

  const internal = String(params.internalApprovalStatus ?? '').toLowerCase()
  return internal === 'pending_internal' || internal === 'approved_internal'
}

export function canEditInternalApprovalCoordinator(params: {
  approvalRequestedAt: string | null | undefined
  internalApprovalStatus: string | null | undefined
}): boolean {
  if (!params.approvalRequestedAt?.trim()) return false
  return String(params.internalApprovalStatus ?? '').toLowerCase() === 'pending_internal'
}
