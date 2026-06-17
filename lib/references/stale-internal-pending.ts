/** DB-Hygiene: intern noch pending_internal, obwohl Kundenfreigabe schon abgeschlossen ist. */
export function isStaleInternalPending(params: {
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  referenceStatus: string
  approvalRequestedAt: string | null
  customerAccessRevoked?: boolean
}): boolean {
  if (params.customerAccessRevoked) return false

  const internal = params.internalApprovalStatus.toLowerCase()
  if (internal !== 'pending_internal') return false

  // Default-Spaltenwert pending_internal ohne gestarteten Workflow ist kein „stale“-Fall.
  if (!params.approvalRequestedAt?.trim()) return false

  const status = params.referenceStatus.toLowerCase()
  const customer = String(params.customerApprovalStatus ?? '').toLowerCase()
  const customerApproved =
    customer === 'approved' || status === 'approved' || status === 'external'

  return customerApproved || status === 'anonymized'
}
