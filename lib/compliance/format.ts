import { formatNdaExpiryDateDe } from '@/lib/accounts/nda-expiry'

import { complianceDocumentTypeLabel } from './document-types'

export function formatComplianceValidUntilLine(validUntil: string | null): string {
  if (!validUntil) return 'Gültig (unbefristet)'
  return `Gültig bis ${formatNdaExpiryDateDe(validUntil)}`
}

/** Tabellen-Spalte „Gültig bis“ — nur Datum (ohne Präfix). */
export function formatComplianceValidUntilDate(validUntil: string | null): string {
  if (!validUntil) return 'Unbefristet'
  return formatNdaExpiryDateDe(validUntil)
}

export function complianceSearchTitle(row: {
  title: string
  document_type: string
}): string {
  const typeLabel = complianceDocumentTypeLabel(row.document_type)
  const title = String(row.title ?? '').trim()
  if (title.toLowerCase().includes(typeLabel.toLowerCase())) return title
  return `${typeLabel} — ${title}`
}
