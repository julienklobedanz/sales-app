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

export type NdaDisplayStatus = 'active' | 'expiring' | 'none'

export function resolveNdaDisplayStatus(
  rows: { status: string; valid_until: string | null }[]
): NdaDisplayStatus {
  if (!rows.length) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)

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

    const end = new Date(`${row.valid_until}T12:00:00`)
    end.setHours(0, 0, 0, 0)
    const days = Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

    if (days < 0) {
      hasExpiring = true
    } else if (days <= 30) {
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
