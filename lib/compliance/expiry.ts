import { ndaDaysUntilExpiry } from '@/lib/accounts/nda-expiry'

/** Abgelaufen, wenn `valid_until` gesetzt und vor heute liegt. Unbefristet = nicht abgelaufen. */
export function isComplianceDocumentExpired(
  validUntil: string | null | undefined,
): boolean {
  if (!validUntil) return false
  return ndaDaysUntilExpiry(validUntil) < 0
}
