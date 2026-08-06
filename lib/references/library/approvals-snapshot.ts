/** Status-Snapshot für Freigabe-Workflow (vor Kunden-Pending beibehalten). */
export function computeApprovalStatusSnapshot(row: {
  status: string | null
  customer_approval_status: string | null
  approval_reference_status_snapshot: string | null
}): string {
  const existing = row.approval_reference_status_snapshot
  if (row.customer_approval_status === 'pending' && existing) {
    return existing
  }
  const s = String(row.status ?? 'draft')
  if (s === 'pending') {
    return existing ?? 'draft'
  }
  return s
}
