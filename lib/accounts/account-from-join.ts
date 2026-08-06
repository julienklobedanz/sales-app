/**
 * Unwraps a Supabase `companies (...)` join (object or single-element array).
 */
export type ParsedAccountJoin = {
  id: string | null
  name: string
  logoUrl: string | null
  isFavorite: boolean
}

export function accountFromJoin(
  raw: unknown,
  opts?: { fallbackName?: string },
): ParsedAccountJoin | null {
  const c = Array.isArray(raw) ? raw[0] : raw
  if (!c || typeof c !== 'object') {
    if (opts?.fallbackName) {
      return { id: null, name: opts.fallbackName, logoUrl: null, isFavorite: false }
    }
    return null
  }

  const id = String((c as { id?: string }).id ?? '').trim() || null
  const name = String((c as { name?: string }).name ?? '').trim()
  const logo = (c as { logo_url?: string | null }).logo_url
  const logoUrl = typeof logo === 'string' && logo.trim() ? logo.trim() : null
  const isFavorite = Boolean((c as { is_favorite?: boolean | null }).is_favorite)
  const resolvedName = name || opts?.fallbackName || ''

  if (!id && !resolvedName) return null

  return {
    id,
    name: resolvedName,
    logoUrl,
    isFavorite,
  }
}
