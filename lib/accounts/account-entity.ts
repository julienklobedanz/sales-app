import { NDA_EXPIRY_WARNING_DAYS, ndaDaysUntilExpiry } from './nda-expiry'

export type AccountEntityKind = 'account' | 'partner'

export type NdaDisplayStatus = 'active' | 'expiring' | 'none'

export type NdaAgreementStatusInput = {
  status: string
  valid_until: string | null
  /** Nur mit hochgeladenem PDF gilt ein NDA als vorhanden (Badge / Grid). */
  file_storage_path?: string | null
}

function hasNdaDocumentUploaded(row: NdaAgreementStatusInput): boolean {
  return Boolean(row.file_storage_path?.trim())
}

export function resolveNdaDisplayStatus(
  rows: NdaAgreementStatusInput[],
): NdaDisplayStatus {
  const documented = rows.filter(hasNdaDocumentUploaded)
  if (!documented.length) return 'none'

  let hasActive = false
  let hasExpiring = false

  for (const row of documented) {
    if (row.status === 'expired') continue
    if (row.status === 'pending') {
      hasExpiring = true
      continue
    }
    if (row.status !== 'active') continue

    if (!row.valid_until) {
      hasActive = true
      continue
    }

    const days = ndaDaysUntilExpiry(row.valid_until)

    if (days < 0) {
      hasExpiring = true
    } else if (days <= NDA_EXPIRY_WARNING_DAYS) {
      hasExpiring = true
      hasActive = true
    } else {
      hasActive = true
    }
  }

  if (hasActive && !hasExpiring) return 'active'
  if (hasExpiring) return 'expiring'
  return 'none'
}
