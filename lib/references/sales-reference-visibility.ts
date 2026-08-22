/** Referenz-Status, die Vertrieb ohne Draft-/Confidential-Cap sieht (aligned mit RPC/RLS). */
const SALES_VISIBLE_REFERENCE_STATUSES = [
  'approved',
  'internal_only',
  'anonymized',
  'external',
] as const

export function isReferenceVisibleToSales(status: string | null | undefined): boolean {
  const normalized = String(status ?? '')
    .toLowerCase()
    .trim()
  if (normalized === 'internal') return true
  return (SALES_VISIBLE_REFERENCE_STATUSES as readonly string[]).includes(normalized)
}

export function filterReferencesForSales<T extends { status: string }>(
  references: T[],
): T[] {
  return references.filter((r) => isReferenceVisibleToSales(r.status))
}
