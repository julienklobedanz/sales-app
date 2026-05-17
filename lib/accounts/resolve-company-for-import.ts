import type { SupabaseClient } from '@supabase/supabase-js'

import {
  companyNameSearchToken,
  companyNamesEquivalent,
  displayCompanyNameForImport,
  normalizeCompanyNameForMatch,
} from '@/lib/accounts/company-name-match'
import {
  fetchBrandfetchCompany,
  inputToDomain,
  type BrandfetchCompanyPayload,
} from '@/lib/accounts/brandfetch-accounts-refresh'

function normalizeDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/** z. B. „Aurubis“ → aurubis.com, wenn Search-API keinen Treffer liefert. */
async function guessDomainFromCompanyName(name: string): Promise<string | null> {
  const token =
    companyNameSearchToken(name) ??
    normalizeCompanyNameForMatch(name).replace(/\s+/g, '')
  if (!token || token.length < 3) return null

  for (const tld of ['com', 'de', 'eu', 'net']) {
    const host = `${token}.${tld}`
    const fetched = await fetchBrandfetchCompany(host)
    if (!fetched.success) continue
    const apiName = fetched.data.companyName ?? ''
    if (
      companyNamesEquivalent(apiName, name) ||
      normalizeCompanyNameForMatch(apiName).includes(token)
    ) {
      return host
    }
  }
  return null
}

async function resolveDomainForCompanyName(name: string): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const direct = inputToDomain(trimmed)
  if (direct?.includes('.')) return direct

  const clientId = process.env.BRANDFETCH_CLIENT_ID?.trim()
  if (clientId && trimmed.length >= 2) {
    try {
      const res = await fetch(
        `https://api.brandfetch.io/v2/search/${encodeURIComponent(trimmed)}?c=${encodeURIComponent(clientId)}`,
        { next: { revalidate: 0 } }
      )
      if (res.ok) {
        const arr = (await res.json()) as Array<{ domain?: string | null; name?: string | null }>
        if (Array.isArray(arr) && arr.length > 0) {
          const ranked = arr
            .map((item) => ({
              domain: normalizeDomain(String(item.domain ?? '')),
              name: String(item.name ?? '').trim(),
            }))
            .filter((x) => x.domain.includes('.'))

          const byName = ranked.find((x) => companyNamesEquivalent(x.name, trimmed))
          if (byName) return byName.domain
          if (ranked[0]?.domain) return ranked[0].domain
        }
      }
    } catch {
      // Search fehlgeschlagen → Domain-Raten
    }
  }

  return guessDomainFromCompanyName(trimmed)
}

export type ResolvedCompanyForImport = {
  companyId: string
  companyName: string
  website_url: string | null
  logo_url: string | null
  industry: string | null
  headquarters: string | null
  employee_count: number | null
}

export type ResolveCompanyForImportResult =
  | { success: true; company: ResolvedCompanyForImport }
  | { success: false; error: string }

type BrandfetchLookup = {
  domain: string | null
  data: BrandfetchCompanyPayload | null
}

async function lookupBrandfetch(rawName: string): Promise<BrandfetchLookup> {
  const domain = await resolveDomainForCompanyName(rawName)
  if (!domain) {
    return { domain: null, data: null }
  }
  const fetched = await fetchBrandfetchCompany(domain)
  return { domain, data: fetched.success ? fetched.data : null }
}

/** Website-Domain zuerst, sonst Namenssuche (+ TLD-Raten). */
async function lookupBrandfetchForCompany(
  rawName: string,
  websiteUrl?: string | null
): Promise<BrandfetchLookup> {
  const websiteDomain = websiteUrl ? inputToDomain(websiteUrl) : null
  if (websiteDomain?.includes('.')) {
    const fetched = await fetchBrandfetchCompany(websiteDomain)
    if (fetched.success) {
      return { domain: websiteDomain, data: fetched.data }
    }
  }
  return lookupBrandfetch(rawName)
}

function payloadFromBrandfetch(
  displayName: string,
  domain: string | null,
  data: BrandfetchCompanyPayload | null,
  existing?: {
    website_url?: string | null
    logo_url?: string | null
    industry?: string | null
    headquarters?: string | null
    employee_count?: number | null
  }
) {
  return {
    name: displayName,
    website_url: data?.websiteUrl ?? existing?.website_url ?? (domain ? `https://${domain}` : null),
    logo_url: data?.logoUrl ?? existing?.logo_url ?? null,
    industry: data?.industry ?? existing?.industry ?? null,
    headquarters: data?.headquarters ?? existing?.headquarters ?? null,
    employee_count: data?.employeeCount ?? existing?.employee_count ?? null,
    description: data?.description ?? null,
    brandfetch_synced_at: domain && data ? new Date().toISOString() : null,
  }
}

function toResolved(
  companyId: string,
  row: {
    name: string | null
    website_url: string | null
    logo_url: string | null
    industry: string | null
    headquarters: string | null
    employee_count: number | null
  }
): ResolvedCompanyForImport {
  return {
    companyId,
    companyName: row.name ?? '',
    website_url: row.website_url,
    logo_url: row.logo_url,
    industry: row.industry,
    headquarters: row.headquarters,
    employee_count: row.employee_count,
  }
}

async function findExistingCompany(
  supabase: SupabaseClient,
  organizationId: string,
  hints: { rawName: string; displayName: string; domain: string | null }
): Promise<{ id: string; name: string } | null> {
  const namesToTry = [...new Set([hints.displayName, hints.rawName].filter(Boolean))]

  for (const n of namesToTry) {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', organizationId)
      .ilike('name', n)
      .limit(1)
      .maybeSingle()
    if (data?.id) return { id: data.id, name: data.name ?? n }
  }

  if (hints.domain) {
    const domainPattern = `%${hints.domain}%`
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', organizationId)
      .ilike('website_url', domainPattern)
      .limit(1)
      .maybeSingle()
    if (data?.id) return { id: data.id, name: data.name ?? hints.displayName }
  }

  const token =
    companyNameSearchToken(hints.displayName) ?? companyNameSearchToken(hints.rawName)
  if (!token) return null

  const { data: candidates } = await supabase
    .from('companies')
    .select('id, name, website_url')
    .eq('organization_id', organizationId)
    .ilike('name', `%${token}%`)
    .limit(20)

  if (!candidates?.length) return null

  for (const row of candidates) {
    const rowName = String(row.name ?? '')
    if (
      companyNamesEquivalent(rowName, hints.displayName) ||
      companyNamesEquivalent(rowName, hints.rawName)
    ) {
      return { id: row.id, name: rowName }
    }
    if (hints.domain && row.website_url) {
      const host = normalizeDomain(String(row.website_url))
      if (host === hints.domain) return { id: row.id, name: rowName }
    }
  }

  return null
}

async function syncCompanyWithBrandfetch(
  supabase: SupabaseClient,
  companyId: string,
  rawName: string,
  brandfetch: BrandfetchLookup
): Promise<ResolvedCompanyForImport> {
  const { data: row } = await supabase
    .from('companies')
    .select('id, name, website_url, logo_url, industry, headquarters, employee_count')
    .eq('id', companyId)
    .maybeSingle()

  if (!row?.id) {
    return {
      companyId,
      companyName: displayCompanyNameForImport(rawName, brandfetch.data?.companyName),
      website_url: null,
      logo_url: null,
      industry: null,
      headquarters: null,
      employee_count: null,
    }
  }

  const displayName = displayCompanyNameForImport(rawName, brandfetch.data?.companyName)
  const payload = payloadFromBrandfetch(displayName, brandfetch.domain, brandfetch.data, row)

  const { data: updated, error } = await supabase
    .from('companies')
    .update(payload)
    .eq('id', companyId)
    .select('id, name, website_url, logo_url, industry, headquarters, employee_count')
    .single()

  if (error || !updated) {
    return toResolved(companyId, { ...row, name: displayName })
  }

  const industry = String(updated.industry ?? '').trim()
  if (industry) {
    await supabase
      .from('references')
      .update({ industry })
      .eq('company_id', companyId)
      .or('industry.is.null,industry.eq.')
  }

  return toResolved(companyId, updated)
}

/**
 * Import: Brandfetch zuerst, dann bestehenden Account per Kernname/Domain finden oder anlegen.
 */
export async function resolveOrCreateCompanyForImport(
  supabase: SupabaseClient,
  organizationId: string,
  rawName: string
): Promise<ResolveCompanyForImportResult> {
  const parsedName = String(rawName ?? '').trim()
  if (!parsedName) {
    return { success: false, error: 'Kein Unternehmensname erkannt.' }
  }

  const brandfetch = await lookupBrandfetch(parsedName)
  const displayName = displayCompanyNameForImport(parsedName, brandfetch.data?.companyName)

  const existing = await findExistingCompany(supabase, organizationId, {
    rawName: parsedName,
    displayName,
    domain: brandfetch.domain,
  })

  if (existing?.id) {
    try {
      const company = await syncCompanyWithBrandfetch(
        supabase,
        existing.id,
        parsedName,
        brandfetch
      )
      return { success: true, company }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Account konnte nicht angereichert werden.',
      }
    }
  }

  const insertPayload = payloadFromBrandfetch(displayName, brandfetch.domain, brandfetch.data)

  const { data: inserted, error } = await supabase
    .from('companies')
    .insert({
      ...insertPayload,
      organization_id: organizationId,
    })
    .select('id, name, website_url, logo_url, industry, headquarters, employee_count')
    .single()

  if (error || !inserted?.id) {
    return { success: false, error: error?.message ?? 'Unternehmen konnte nicht angelegt werden.' }
  }

  return {
    success: true,
    company: toResolved(inserted.id, inserted),
  }
}

/** Bearbeiten: bestehenden Account per Brandfetch aktualisieren. */
export async function syncExistingCompanyBrandfetch(
  supabase: SupabaseClient,
  organizationId: string,
  companyId: string,
  options?: { excludeLogoUrl?: string | null }
): Promise<ResolveCompanyForImportResult> {
  const { data: row } = await supabase
    .from('companies')
    .select('id, name, website_url, logo_url')
    .eq('id', companyId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!row?.id) {
    return { success: false, error: 'Account nicht gefunden.' }
  }

  let brandfetch = await lookupBrandfetchForCompany(
    String(row.name ?? ''),
    row.website_url
  )
  const failedLogo = String(options?.excludeLogoUrl ?? '').trim()
  if (failedLogo && brandfetch.domain) {
    const refetched = await fetchBrandfetchCompany(brandfetch.domain, {
      excludeLogoUrl: failedLogo,
    })
    if (refetched.success) {
      brandfetch = { domain: brandfetch.domain, data: refetched.data }
    }
  }

  const company = await syncCompanyWithBrandfetch(supabase, row.id, String(row.name ?? ''), brandfetch)
  return { success: true, company }
}
