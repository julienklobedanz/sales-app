export type CompanyEntityKind = 'account' | 'partner'

export type PartnerCategory = 'sub' | 'tech' | 'legal' | 'other'

export const PARTNER_CATEGORY_OPTIONS: { value: PartnerCategory; label: string }[] = [
  { value: 'sub', label: 'Subunternehmer' },
  { value: 'tech', label: 'Tech' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Sonstiges' },
]

export function partnerCategoryLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return PARTNER_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value
}

import { NDA_EXPIRY_WARNING_DAYS, ndaDaysUntilExpiry } from '@/lib/accounts/nda-expiry'

export type NdaDisplayStatus = 'active' | 'expiring' | 'none'

export function resolveNdaDisplayStatus(
  rows: { status: string; valid_until: string | null }[]
): NdaDisplayStatus {
  if (!rows.length) return 'none'

  let hasActive = false
  let hasExpiring = false

  for (const row of rows) {
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
