import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { resolveDomainForCompanyName } from '@/lib/accounts/resolve-company-for-import'
import { fetchBrandfetchCompany, pickBestLogoUrlFromBrandfetchJson } from '@/lib/accounts/brandfetch-accounts-refresh'
import { ensureBrandfetchDarkLogoUrl } from '@/lib/brandfetch/logo-theme-url'
import { mapBrandfetchIndustriesArrayToGermanCategory } from '@/lib/brandfetch/map-brandfetch-industry-to-de'
import {
  discoverAndSaveCompanyNewsrooms,
  scheduleCompanyNewsroomDiscovery,
} from '@/lib/market-signals/discover-company-newsroom'
import { log } from '@/lib/observability/logger'
import type {
  CompanySearchResult,
  CompanySearchSuggestion,
  EnrichCompanyResult,
  FetchEnrichmentResult,
} from './reference-new-action-types'

const COUNTRY_MAP: Record<string, string> = {
  germany: 'Deutschland', deutschland: 'Deutschland',
  austria: 'Österreich', österreich: 'Österreich',
  switzerland: 'Schweiz', schweiz: 'Schweiz',
  france: 'Frankreich', frankreich: 'Frankreich',
  'united kingdom': 'Großbritannien', uk: 'Großbritannien', großbritannien: 'Großbritannien',
  'united states': 'USA', usa: 'USA', us: 'USA',
}
const COUNTRY_CODE_MAP: Record<string, string> = {
  DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', FR: 'Frankreich',
  GB: 'Großbritannien', US: 'USA',
}

export function normalizeDomain(input: string): string {
  const t = input.trim().toLowerCase()
  const withoutProtocol = t.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return withoutProtocol || t
}

/** Leitet eine Domain aus der Eingabe ab: "siemens.de" → "siemens.de", "BMW" → "bmw.com" */
export function inputToDomain(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const normalized = normalizeDomain(t)
  if (normalized.includes('.')) return normalized
  const slug = t
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\b(gmbh|ag|inc|corp|co|llc)\b/gi, '')
    .replace(/[^a-z0-9-]/gi, '')
  if (slug.length < 2) return null
  return `${slug}.com`
}

function mapBrandfetchCountry(countryName: string | undefined, countryCode?: string | undefined): string | null {
  if (countryCode) {
    const mapped = COUNTRY_CODE_MAP[countryCode.trim().toUpperCase()]
    if (mapped) return mapped
  }
  if (!countryName) return null
  const key = countryName.trim().toLowerCase()
  return COUNTRY_MAP[key] ?? null
}

/** Prüft, ob der String wie eine technische URL/Domain aussieht (z. B. "biontechse.com"). */
export function looksLikeDomain(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t || t.includes(' ')) return false
  return /\.(com|de|net|org|io|eu|co|ai|cloud|global)$/i.test(t) || /\.[a-z]{2,}$/i.test(t)
}

/** Konvertiert Domain zu lesbarem Namen: TLD entfernen, großschreiben (z. B. "biontechse.com" → "Biontechse"). */
export function domainToDisplayName(domain: string): string {
  const withoutProtocol = domain.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] ?? domain
  const withoutTld = withoutProtocol.replace(/\.(com|de|net|org|io|eu|co|ai|cloud|global|[a-z]{2,})$/i, '').trim()
  const name = withoutTld || withoutProtocol
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

/**
 * Brand-Search (Name) — optional mit BRANDFETCH_CLIENT_ID.
 * Ohne Client-ID: einzelner Fallback über Domain-Raten + /v2/brands/domain (wie bisher).
 */
type BrandfetchSuggestionsMeta = { rateLimited?: boolean; notConfigured?: boolean }

async function brandfetchSuggestionsForQuery(
  query: string
): Promise<{ suggestions: CompanySearchSuggestion[]; meta: BrandfetchSuggestionsMeta }> {
  const q = query.trim()
  if (q.length < 1) return { suggestions: [], meta: {} }

  const hasApiKey = Boolean(process.env.BRANDFETCH_API_KEY?.trim())
  const hasClientId = Boolean(process.env.BRANDFETCH_CLIENT_ID?.trim())
  if (!hasApiKey && !hasClientId) {
    return { suggestions: [], meta: { notConfigured: true } }
  }

  const out: CompanySearchSuggestion[] = []
  const seen = new Set<string>()
  const meta: BrandfetchSuggestionsMeta = {}

  const pushFromSearchApi = async (): Promise<void> => {
    const clientId = process.env.BRANDFETCH_CLIENT_ID?.trim()
    if (!clientId || q.length < 2) return
    try {
      const res = await fetch(
        `https://api.brandfetch.io/v2/search/${encodeURIComponent(q)}?c=${encodeURIComponent(clientId)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const arr = (await res.json()) as Array<{
        name?: string | null
        domain: string
        icon?: string | null
      }>
      if (!Array.isArray(arr)) return
      for (const item of arr) {
        if (!item?.domain) continue
        const domain = normalizeDomain(item.domain)
        if (!domain || seen.has(domain)) continue
        seen.add(domain)
        out.push({
          id: `brandfetch:${domain}`,
          name: (item.name?.trim() || domain) as string,
          logo_url: ensureBrandfetchDarkLogoUrl(item.icon) ?? item.icon ?? null,
          source: 'brandfetch',
        })
        if (out.length >= 8) break
      }
    } catch (e) {
      log.error('brandfetchSuggestionsForQuery.failed', { query }, e)
    }
  }

  const pushFromResolvedDomain = async (): Promise<void> => {
    if (out.length >= 8) return
    const direct = inputToDomain(q) ?? (normalizeDomain(q).includes('.') ? normalizeDomain(q) : null)
    const domain =
      direct && direct.includes('.') ? direct : await resolveDomainForCompanyName(q)
    if (!domain || !domain.includes('.') || seen.has(domain)) return

    const fetched = await fetchBrandfetchCompany(domain)
    if (!fetched.success) {
      if (fetched.status === 429) meta.rateLimited = true
      return
    }

    seen.add(domain)
    const displayName = fetched.data.companyName?.trim() || q
    const duplicateName = out.some((s) => s.name.trim().toLowerCase() === displayName.toLowerCase())
    if (!duplicateName) {
      out.push({
        id: `brandfetch:${domain}`,
        name: displayName,
        logo_url: ensureBrandfetchDarkLogoUrl(fetched.data.logoUrl),
        source: 'brandfetch',
      })
    }
  }

  await pushFromSearchApi()
  await pushFromResolvedDomain()

  return { suggestions: out, meta }
}

/** Sucht Unternehmensvorschläge für die Combobox (lokal in der Organisation + Brandfetch). */
export async function searchCompanySuggestionsImpl(input: string): Promise<CompanySearchResult> {
  const query = input.trim()
  if (!query) {
    return { success: true, suggestions: [] }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const organizationId = profile?.organization_id ?? null
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const safeForLike = query.replace(/%/g, '').replace(/_/g, '').trim()

  // 1. Suche in bestehenden Companies der Organisation (Teilstring, case-insensitive)
  let companies: { id: string; name: string; logo_url?: string | null }[] = []
  if (safeForLike) {
    const pattern = `%${safeForLike}%`
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, logo_url')
      .eq('organization_id', organizationId)
      .ilike('name', pattern)
      .order('name')
      .limit(10)
    if (error) {
      log.error('searchCompanySuggestions.failed', { organizationId, pattern }, error)
      return { success: false, error: error.message }
    }
    companies = data ?? []
  }

  const suggestions: CompanySearchSuggestion[] = companies.map((c) => ({
    id: c.id,
    name: c.name,
    logo_url: (c as { logo_url?: string | null }).logo_url ?? null,
    source: 'local',
  }))

  // 2. Brandfetch-Vorschläge (parallel zu lokalen Treffern)
  const { suggestions: remote, meta } = await brandfetchSuggestionsForQuery(query)
  const seenNames = new Set(suggestions.map((s) => s.name.toLowerCase()))
  for (const r of remote) {
    if (seenNames.has(r.name.toLowerCase())) continue
    seenNames.add(r.name.toLowerCase())
    suggestions.push(r)
  }

  let hint: string | undefined
  if (suggestions.length === 0 && remote.length === 0) {
    if (meta.notConfigured) {
      hint =
        'Markendaten-Suche ist nicht eingerichtet (BRANDFETCH_API_KEY oder BRANDFETCH_CLIENT_ID in .env.local).'
    } else if (meta.rateLimited) {
      hint =
        'Brandfetch-Limit erreicht — bitte kurz warten. Für bessere Namenssuche BRANDFETCH_CLIENT_ID hinterlegen.'
    }
  }

  return { success: true, suggestions, hint }
}

export async function enrichAndSaveCompanyImpl(domain: string): Promise<EnrichCompanyResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const organizationId = profile?.organization_id ?? null
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const trimmed = domain.trim()
  let normalizedDomain: string | null = null

  if (looksLikeDomain(trimmed)) {
    normalizedDomain = normalizeDomain(trimmed)
  } else {
    const resolved = await resolveDomainForEnrichmentInput(trimmed)
    if (resolved) {
      normalizedDomain = resolved
    } else {
      const guessed = inputToDomain(trimmed) ?? normalizeDomain(trimmed)
      if (guessed && guessed.includes('.')) normalizedDomain = guessed
    }
  }

  if (!normalizedDomain || !normalizedDomain.includes('.')) {
    return {
      success: false,
      error:
        'Zu diesem Namen konnten keine Markendaten gefunden werden. Bitte den Firmennamen präzisieren oder die Felder manuell ausfüllen.',
    }
  }

  const fetched = await fetchBrandfetchData(normalizedDomain)
  if (!fetched.success) return fetched

  const { company_name: companyName, website_url: websiteUrl, industry, headquarters, country, employee_count: employeeCount, logo_url: logoUrl, description } = fetched

  const { data: existingByName } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', companyName)
    .maybeSingle()

  let existing = existingByName
  if (!existing?.id && normalizedDomain) {
    const domainPattern = `%${normalizedDomain}%`
    const { data: existingByDomain } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('website_url', domainPattern)
      .limit(1)
      .maybeSingle()
    existing = existingByDomain ?? null
  }

  const payload = {
    name: companyName,
    organization_id: organizationId,
    website_url: websiteUrl || null,
    logo_url: logoUrl || null,
    employee_count: employeeCount,
    headquarters: headquarters || null,
    description: description || null,
    industry: industry || null,
  }

  if (existing?.id) {
    const { error } = await supabase.from('companies').update(payload).eq('id', existing.id)
    if (error) return { success: false, error: error.message }
    if (websiteUrl) {
      void discoverAndSaveCompanyNewsrooms(supabase, existing.id, {
        websiteUrl: websiteUrl || null,
        force: true,
      }).catch(() => {})
    }
    revalidatePath(ROUTES.references.new)
    return {
      success: true,
      company_id: existing.id,
      company_name: companyName,
      website_url: websiteUrl || null,
      industry,
      headquarters,
      country,
      employee_count: employeeCount,
      logo_url: logoUrl,
    }
  }

  const { data: inserted, error } = await supabase.from('companies').insert(payload).select('id').single()
  if (error) return { success: false, error: error.message }
  if (!inserted?.id) return { success: false, error: 'Firma konnte nicht angelegt werden.' }
  scheduleCompanyNewsroomDiscovery(supabase, inserted.id, websiteUrl || null)
  revalidatePath(ROUTES.references.new)
  return {
    success: true,
    company_id: inserted.id,
    company_name: companyName,
    website_url: websiteUrl || null,
    industry,
    headquarters,
    country,
    employee_count: employeeCount,
    logo_url: logoUrl,
  }
}

async function fetchBrandfetchData(normalizedDomain: string): Promise<FetchEnrichmentResult> {
  const apiKey = process.env.BRANDFETCH_API_KEY
  if (!apiKey) return { success: false, error: 'Brandfetch API ist nicht konfiguriert (BRANDFETCH_API_KEY).' }

  let res: Response
  try {
    res = await fetch(`https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(normalizedDomain)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
  } catch {
    return { success: false, error: 'Brandfetch-Anfrage fehlgeschlagen.' }
  }

  if (!res.ok) {
    if (res.status === 404) return { success: false, error: 'Unternehmen für diese Domain nicht gefunden.' }
    if (res.status === 401) return { success: false, error: 'Brandfetch API-Schlüssel ungültig.' }
    if (res.status === 429) return { success: false, error: 'Brandfetch-Limit erreicht.' }
    return { success: false, error: `Brandfetch-Fehler: ${res.status}` }
  }

  let data: {
    name?: string | null
    brand?: string | null
    domain?: string | null
    description?: string | null
    company?: {
      employees?: number | null
      industries?: { name?: string }[]
      location?: { city?: string; country?: string; countryCode?: string; region?: string }
    }
    logos?: {
      theme?: string | null
      type?: string | null
      formats?: { src?: string; format?: string; background?: string | null }[]
    }[]
  }
  try {
    data = await res.json()
  } catch {
    return { success: false, error: 'Ungültige Brandfetch-Antwort.' }
  }

  const rawName = (data.name ?? data.brand ?? data.domain ?? normalizedDomain).toString().trim() || normalizedDomain
  let companyName: string
  if (looksLikeDomain(rawName)) {
    companyName = domainToDisplayName(rawName)
  } else {
    companyName = rawName
  }
  const websiteUrl = data.domain ? `https://${data.domain.toString().replace(/^https?:\/\//, '').replace(/^www\./, '')}` : `https://${normalizedDomain}`
  const description = data.description?.toString().trim() || null
  const employeeCount = typeof data.company?.employees === 'number' ? data.company.employees : null
  const industry = mapBrandfetchIndustriesArrayToGermanCategory(data.company?.industries)
  const loc = data.company?.location
  const headquarters = [loc?.city, loc?.country].filter(Boolean).join(', ') || null
  const country = mapBrandfetchCountry(loc?.country, loc?.countryCode)
  const logoUrl = ensureBrandfetchDarkLogoUrl(pickBestLogoUrlFromBrandfetchJson(data))

  return {
    success: true,
    company_name: companyName,
    website_url: websiteUrl || null,
    industry,
    headquarters,
    country,
    employee_count: employeeCount,
    logo_url: logoUrl,
    description,
  }
}

/** Nur Brandfetch-Daten abrufen (kein Speichern in DB). Für Referenz bearbeiten. */
async function resolveDomainForEnrichmentInput(input: string): Promise<string | null> {
  const trimmed = input.trim()
  if (!trimmed) return null
  const directDomain = inputToDomain(trimmed) ?? normalizeDomain(trimmed)
  if (directDomain && directDomain.includes('.')) return directDomain
  return resolveDomainForCompanyName(trimmed)
}

export async function fetchCompanyEnrichmentImpl(input: string): Promise<FetchEnrichmentResult> {
  const domain = await resolveDomainForEnrichmentInput(input)
  if (!domain) {
    return {
      success: false,
      error:
        'Kein Unternehmen zu diesem Namen gefunden. Bitte den Firmennamen präzisieren oder Stammdaten manuell ausfüllen.',
    }
  }
  return fetchBrandfetchData(domain)
}
