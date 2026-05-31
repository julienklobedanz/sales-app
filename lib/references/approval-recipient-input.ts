import type { ApprovalContactOption } from '@/app/dashboard/references/approval-contacts'

export function isApprovalRecipientEmail(value: string): boolean {
  const t = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function filterApprovalContactSuggestions(
  contacts: ApprovalContactOption[],
  query: string,
  limit = 8
): ApprovalContactOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return contacts.slice(0, limit)
  return contacts
    .filter((c) => {
      const hay = `${c.label} ${c.email ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, limit)
}

export function canSubmitApprovalRecipient(params: {
  query: string
  selected: ApprovalContactOption | null
}): boolean {
  if (params.selected?.email?.includes('@')) return true
  return isApprovalRecipientEmail(params.query)
}
