import {
  NDA_EXPIRY_WARNING_DAYS,
  ndaDaysUntilExpiry,
} from '@/lib/accounts/nda-expiry'

export const COMPLIANCE_EXPIRY_WARNING_DAYS = NDA_EXPIRY_WARNING_DAYS

export type ComplianceValidityStatus = 'valid' | 'expiring' | 'expired'

/** Abgelaufen, wenn `valid_until` gesetzt und vor heute liegt. Unbefristet = nicht abgelaufen. */
export function isComplianceDocumentExpired(
  validUntil: string | null | undefined,
  refDate?: Date,
): boolean {
  return complianceValidityStatus(validUntil, refDate) === 'expired'
}

/** Gültigkeitsstatus: unbefristet und außerhalb des 30-Tage-Fensters = gültig. */
export function complianceValidityStatus(
  validUntil: string | null | undefined,
  refDate: Date = new Date(),
): ComplianceValidityStatus {
  if (!validUntil) return 'valid'
  const days = ndaDaysUntilExpiry(validUntil, refDate)
  if (days < 0) return 'expired'
  if (days <= COMPLIANCE_EXPIRY_WARNING_DAYS) return 'expiring'
  return 'valid'
}
