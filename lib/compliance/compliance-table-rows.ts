import type { ComplianceDocumentRow } from '@/app/(app)/settings/compliance-actions'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { isComplianceDocumentExpired } from '@/lib/compliance/expiry'

/** Eine Zeile pro Dokumenttyp — aktuelle Version; ältere nur im Sheet. */
export function groupComplianceDocumentsForTable(
  documents: ComplianceDocumentRow[],
): ComplianceDocumentRow[] {
  const byType = new Map<string, ComplianceDocumentRow[]>()
  for (const doc of documents) {
    const list = byType.get(doc.document_type) ?? []
    list.push(doc)
    byType.set(doc.document_type, list)
  }

  const rows: ComplianceDocumentRow[] = []
  for (const versions of byType.values()) {
    const current = versions.find((v) => v.is_current)
    if (current) {
      rows.push(current)
      continue
    }
    const sorted = [...versions].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    if (sorted[0]) rows.push(sorted[0])
  }
  return rows
}

function complianceDocumentSearchHaystack(doc: ComplianceDocumentRow): string {
  return [doc.title, complianceDocumentTypeLabel(doc.document_type), doc.file_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** Suche auch in archivierten Versionen — Tabelle zeigt trotzdem die aktuelle Zeile. */
export function filterComplianceDocumentsForTable(args: {
  documents: ComplianceDocumentRow[]
  search: string
  showExpired: boolean
}): ComplianceDocumentRow[] {
  const grouped = groupComplianceDocumentsForTable(args.documents)
  let rows = grouped

  if (!args.showExpired) {
    rows = rows.filter((doc) => !isComplianceDocumentExpired(doc.valid_until))
  }

  const q = args.search.trim().toLowerCase()
  if (!q) return rows

  const matchingTypes = new Set<string>()
  for (const doc of args.documents) {
    if (complianceDocumentSearchHaystack(doc).includes(q)) {
      matchingTypes.add(doc.document_type)
    }
  }

  return rows.filter((doc) => matchingTypes.has(doc.document_type))
}
