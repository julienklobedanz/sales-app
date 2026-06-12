function capitalizeToken(token: string): string {
  const lower = token.toLowerCase()
  if (!lower) return ''
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * Leitet einen Anzeigenamen aus der E-Mail ab (z. B. alex.stoepel@web.de → Alex Stoepel).
 */
export function deriveReferenceGiverNameFromEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf('@')
  if (at <= 0) return null

  const local = trimmed.slice(0, at)
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (!parts.length) return null

  if (parts.length === 1) {
    return capitalizeToken(parts[0]!)
  }

  return parts.map(capitalizeToken).join(' ')
}
