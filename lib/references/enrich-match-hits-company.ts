import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type MatchHitCompanyFields = {
  companyId: string | null
  companyName: string | null
  companyLogoUrl: string | null
}

function companyFromJoin(raw: unknown): { id: string; name: string; logo_url: string | null } | null {
  const c = Array.isArray(raw) ? raw[0] : raw
  if (!c || typeof c !== 'object') return null
  const id = String((c as { id?: string }).id ?? '').trim()
  const name = String((c as { name?: string }).name ?? '').trim()
  if (!id && !name) return null
  const logo = (c as { logo_url?: string | null }).logo_url
  return {
    id,
    name,
    logo_url: typeof logo === 'string' && logo.trim() ? logo.trim() : null,
  }
}

/** Lädt Account-Logo und -Name für Match-/Such-Treffer nach. */
export async function fetchCompanyFieldsForReferenceIds(
  supabase: SupabaseClient,
  referenceIds: string[]
): Promise<Map<string, MatchHitCompanyFields>> {
  const map = new Map<string, MatchHitCompanyFields>()
  if (!referenceIds.length) return map

  const { data, error } = await supabase
    .from('references')
    .select('id, company_id, companies ( id, name, logo_url )')
    .in('id', referenceIds)

  if (error) return map

  for (const row of data ?? []) {
    const co = companyFromJoin(row.companies)
    map.set(String(row.id), {
      companyId: co?.id ?? (row.company_id ? String(row.company_id) : null),
      companyName: co?.name ?? null,
      companyLogoUrl: co?.logo_url ?? null,
    })
  }

  return map
}
