/** Referenz-Status, die Sales im Evidence-Hub sehen und nutzen darf. */
export const SALES_VISIBLE_REFERENCE_STATUSES = [
  'approved',
  'internal_only',
  'anonymized',
  'external',
  'internal',
] as const

export type SalesVisibleReferenceStatus = (typeof SALES_VISIBLE_REFERENCE_STATUSES)[number]

export function isReferenceVisibleToSales(status: string | null | undefined): boolean {
  const normalized = String(status ?? '').toLowerCase().trim()
  return (SALES_VISIBLE_REFERENCE_STATUSES as readonly string[]).includes(normalized)
}

export function filterReferencesForSales<T extends { status: string }>(references: T[]): T[] {
  return references.filter((r) => isReferenceVisibleToSales(r.status))
}
