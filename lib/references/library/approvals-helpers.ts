import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { deriveReferenceGiverNameFromEmail } from '@/lib/references/derive-reference-giver-name-from-email'

export function referenceGiverNameFromRecipientEmail(email: string): string | null {
  return deriveReferenceGiverNameFromEmail(email)
}

export function companyNameFromReferenceRow(
  companies: unknown,
  fallback = 'Referenz',
): string {
  return accountFromJoin(companies)?.name ?? fallback
}

export function withdrawRestoredReferenceStatus(
  snapshot: string | null | undefined,
): string {
  const trimmed = typeof snapshot === 'string' ? snapshot.trim() : ''
  return trimmed || 'draft'
}
