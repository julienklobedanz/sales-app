/** Kunden-Freigabestatus inkl. Legacy: extern ohne customer_approval_status. */

export type EffectiveCustomerApproval =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked_by_customer'
  | null

export function effectiveCustomerApprovalStatus(
  customerApprovalStatus: string | null | undefined,
  referenceStatus: string | null | undefined
): EffectiveCustomerApproval {
  const customer = String(customerApprovalStatus ?? '').toLowerCase()
  if (
    customer === 'pending' ||
    customer === 'approved' ||
    customer === 'rejected' ||
    customer === 'expired' ||
    customer === 'revoked_by_customer'
  ) {
    return customer
  }
  const status = String(referenceStatus ?? '').toLowerCase()
  if (status === 'external' || status === 'approved') {
    return 'approved'
  }
  return null
}

export function hasActiveCustomerApprovalWorkflow(
  customerApprovalStatus: string | null | undefined,
  referenceStatus: string | null | undefined
): boolean {
  const effective = effectiveCustomerApprovalStatus(customerApprovalStatus, referenceStatus)
  return effective === 'pending' || effective === 'approved'
}
