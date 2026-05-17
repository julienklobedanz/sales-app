import type { SupabaseClient } from '@supabase/supabase-js'

import {
  fetchBrandfetchCompany,
  inputToDomain,
} from '@/lib/accounts/brandfetch-accounts-refresh'
function normalizeDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

async function resolveDomainForCompanyName(name: string): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const direct = inputToDomain(trimmed)
  if (direct?.includes('.')) return direct

  const clientId = process.env.BRANDFETCH_CLIENT_ID?.trim()
  if (!clientId || trimmed.length < 2) return null
  try {
    const res = await fetch(
      `https://api.brandfetch.io/v2/search/${encodeURIComponent(trimmed)}?c=${encodeURIComponent(clientId)}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const arr = (await res.json()) as Array<{ domain?: string | null }>
    const first = normalizeDomain(String(arr[0]?.domain ?? ''))
    return first.includes('.') ? first : null
  } catch {
    return null
  }
}

export type ResolveCompanyForImportResult =
  | { success: true; companyId: string; companyName: string }
  | { success: false; error: string }

/**
 * Findet oder legt einen Account für den Bulk-Import an (optional Brandfetch-Anreicherung).
 */
export async function resolveOrCreateCompanyForImport(
  supabase: SupabaseClient,
  organizationId: string,
  rawName: string
): Promise<ResolveCompanyForImportResult> {
  const name = String(rawName ?? '').trim()
  if (!name) {
    return { success: false, error: 'Kein Unternehmensname erkannt.' }
  }

  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', organizationId)
    .ilike('name', name)
    .maybeSingle()

  if (existing?.id) {
    return { success: true, companyId: existing.id, companyName: existing.name ?? name }
  }

  let website_url: string | null = null
  let logo_url: string | null = null
  let industry: string | null = null
  let headquarters: string | null = null
  let employee_count: number | null = null
  let description: string | null = null
  let resolvedName = name

  const domain = await resolveDomainForCompanyName(name)
  if (domain) {
    const fetched = await fetchBrandfetchCompany(domain)
    if (fetched.success) {
      const d = fetched.data
      if (d.companyName) resolvedName = d.companyName
      website_url = d.websiteUrl
      logo_url = d.logoUrl
      industry = d.industry
      headquarters = d.headquarters
      employee_count = d.employeeCount
      description = d.description
    } else {
      website_url = `https://${domain}`
    }
  }

  const { data: inserted, error } = await supabase
    .from('companies')
    .insert({
      name: resolvedName,
      organization_id: organizationId,
      website_url,
      logo_url,
      industry,
      headquarters,
      employee_count,
      description,
      brandfetch_synced_at: domain ? new Date().toISOString() : null,
    })
    .select('id, name')
    .single()

  if (error || !inserted?.id) {
    return { success: false, error: error?.message ?? 'Unternehmen konnte nicht angelegt werden.' }
  }

  return {
    success: true,
    companyId: inserted.id,
    companyName: inserted.name ?? resolvedName,
  }
}
