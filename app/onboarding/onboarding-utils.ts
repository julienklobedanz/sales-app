export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') }
}

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail',
  'googlemail',
  'yahoo',
  'hotmail',
  'outlook',
  'live',
  'icloud',
  'me',
  'gmx',
  'web',
  't-online',
])

export function guessCompanyFromEmail(email: string): string {
  const domain = email.split('@')[1]?.trim().toLowerCase()
  if (!domain) return ''
  const label = domain.split('.')[0] ?? ''
  if (!label || PERSONAL_EMAIL_DOMAINS.has(label)) return ''
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function joinFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
}
