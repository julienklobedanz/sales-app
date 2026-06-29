import { deriveReferenceGiverNameFromEmail } from '@/lib/references/derive-reference-giver-name-from-email'
import type { ReferenceApprovalRow } from '@/lib/references/library/approvals-types'

export function referenceGiverNameFromRecipientEmail(email: string): string | null {
  return deriveReferenceGiverNameFromEmail(email)
}

export function companyNameFromReferenceRow(
  companies: ReferenceApprovalRow['companies'],
  fallback = 'Referenz'
): string {
  const company =
    Array.isArray(companies) && companies.length > 0
      ? companies[0]
      : (companies as { name?: string } | null)
  return company?.name ?? fallback
}

export function withdrawRestoredReferenceStatus(snapshot: string | null | undefined): string {
  const trimmed = typeof snapshot === 'string' ? snapshot.trim() : ''
  return trimmed || 'draft'
}
