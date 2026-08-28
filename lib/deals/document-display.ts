export type DealDocumentOwnerFields = {
  deal_id: string | null
  tender_id: string | null
  created_at: string
}

export function isTenderOwnedDocument(
  row: Pick<DealDocumentOwnerFields, 'deal_id' | 'tender_id'>,
): boolean {
  return row.tender_id != null && row.deal_id == null
}

export function mergeLotAndTenderDocuments<T extends DealDocumentOwnerFields>(
  lotDocuments: T[],
  tenderDocuments: T[],
): T[] {
  return [...lotDocuments, ...tenderDocuments].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
}

export type DocumentCardOwner =
  | { kind: 'deal'; id: string; title: string; tenderId: string | null }
  | { kind: 'tender'; id: string; title: string; lots: Array<{ id: string; title: string }> }
