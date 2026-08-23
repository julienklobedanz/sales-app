export function normalizeWrappedParagraphs(input: string): string {
  const raw = input.replace(/\r\n/g, '\n').trim()
  if (!raw) return ''

  // Split into paragraphs by blank lines, then join single line breaks within a paragraph.
  const paragraphs = raw
    .split(/\n{2,}/g)
    .map((p) =>
      p
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean)

  return paragraphs.join('\n\n')
}

/** Client-seitige Server-Action / Fetch-Fehler, die oft auf Proxy, Timeout oder Größenlimits hindeuten. */
export function looksLikeProxyOrNetworkFailure(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('unexpected') ||
    m.includes('failed to fetch') ||
    m.includes('fetch failed') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('aborted') ||
    m.includes('econnreset') ||
    m.includes('socket hang up') ||
    m.includes('504') ||
    m.includes('502') ||
    m.includes('503') ||
    m.includes('413') ||
    (m.includes('body') && (m.includes('large') || m.includes('limit')))
  )
}

export function normalizeContactIdentity(
  parts: Array<string | null | undefined>,
): string {
  return parts
    .map((part) =>
      String(part ?? '')
        .trim()
        .toLowerCase(),
    )
    .join('|')
}

export function normalizeTag(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed === trimmed.toUpperCase() && /[A-ZÄÖÜ]/.test(trimmed)) {
    return trimmed
  }
  const lower = trimmed.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function parseInitialTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  const seen = new Set<string>()
  const result: string[] = []
  tags
    .split(/[\s,;]+/)
    .map((s) => normalizeTag(s))
    .filter(Boolean)
    .forEach((t) => {
      if (!seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase())
        result.push(t)
      }
    })
  return result
}

export function formatZodError(error: import('zod').ZodError): string {
  return (
    error.issues.map((i) => i.message).join(' · ') || 'Bitte Pflichtfelder ausfüllen.'
  )
}

export function dedupeContacts<
  T extends {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
  },
>(contacts: T[]): T[] {
  const seenContactIds = new Set<string>()
  const seenContactIdentities = new Set<string>()
  return contacts.filter((c) => {
    const identity = normalizeContactIdentity([c.first_name, c.last_name, c.email])
    if (identity !== '||' && seenContactIdentities.has(identity)) return false
    if (seenContactIds.has(c.id)) return false
    if (identity !== '||') seenContactIdentities.add(identity)
    seenContactIds.add(c.id)
    return true
  })
}

export function dedupeCustomerContacts<T extends { id: string }>(contacts: T[]): T[] {
  const seenCustomerIds = new Set<string>()
  return contacts.filter((c) => {
    if (seenCustomerIds.has(c.id)) return false
    seenCustomerIds.add(c.id)
    return true
  })
}
