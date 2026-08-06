/**
 * Unwraps a Supabase `companies (...)` join (object or single-element array).
 */
import type { Tables } from '@/lib/supabase/db-types'

export type ParsedAccountJoin = {
  id: string | null
  name: string
  logoUrl: string | null
  isFavorite: boolean
}

type AccountJoinFields = Pick<
  Tables<'companies'>,
  'id' | 'name' | 'logo_url' | 'is_favorite'
>

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

  const row = c as Partial<AccountJoinFields>
  const id = String(row.id ?? '').trim() || null
  const name = String(row.name ?? '').trim()
  const logo = row.logo_url
  const logoUrl = typeof logo === 'string' && logo.trim() ? logo.trim() : null
  const isFavorite = Boolean(row.is_favorite)
  const resolvedName = name || opts?.fallbackName || ''

  if (!id && !resolvedName) return null

  return {
    id,
    name: resolvedName,
    logoUrl,
    isFavorite,
  }
}
