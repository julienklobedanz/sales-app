import type { SupabaseClient } from '@supabase/supabase-js'
import { mapBrandfetchIndustriesArrayToGermanCategory } from '@/lib/brandfetch/map-brandfetch-industry-to-de'

export type BrandfetchCompanyPayload = {
  companyName: string | null
  websiteUrl: string | null
  logoUrl: string | null
  industry: string | null
  headquarters: string | null
  employeeCount: number | null
  description: string | null
}

function normalizeDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

export function inputToDomain(input: string | null | undefined): string | null {
  const s = String(input ?? '').trim()
  if (!s) return null
  const normalized = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const host = new URL(normalized).hostname
    const d = normalizeDomain(host)
    return d.includes('.') ? d : null
  } catch {
    const d = normalizeDomain(s)
    return d.includes('.') ? d : null
  }
}

function normalizeTextValue(raw: string | null | undefined) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const TLD_COUNTRY_FALLBACK: Record<string, string> = {
  de: 'Germany',
  at: 'Austria',
  ch: 'Switzerland',
  uk: 'United Kingdom',
  'co.uk': 'United Kingdom',
  fr: 'France',
  it: 'Italy',
  es: 'Spain',
  nl: 'Netherlands',
  be: 'Belgium',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  ie: 'Ireland',
  pl: 'Poland',
  cz: 'Czechia',
  pt: 'Portugal',
  us: 'United States',
  ca: 'Canada',
  au: 'Australia',
}

function countryFromCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? '').trim().toUpperCase()
  if (!code) return null
  try {
    const names = new Intl.DisplayNames(['de'], { type: 'region' })
    return names.of(code) ?? null
  } catch {
    return null
  }
}

function countryFromDomainTld(domain: string): string | null {
  const host = normalizeDomain(domain)
  if (!host.includes('.')) return null
  const parts = host.split('.').filter(Boolean)
  if (parts.length < 2) return null
  const last = parts[parts.length - 1] ?? ''
  const secondLast = parts[parts.length - 2] ?? ''
  const compound = `${secondLast}.${last}`
  return TLD_COUNTRY_FALLBACK[compound] ?? TLD_COUNTRY_FALLBACK[last] ?? null
}

function readStringField(obj: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!obj) return null
  for (const key of keys) {
    const value = obj[key]
    const s = String(value ?? '').trim()
    if (s) return s
  }
  return null
}

function parseHeadquartersFromUnknown(input: unknown): string | null {
  if (!input) return null
  if (typeof input === 'string') {
    const s = input.trim()
    return s || null
  }
  if (typeof input !== 'object') return null
  const obj = input as Record<string, unknown>
  const singleLine = readStringField(obj, [
    'formattedAddress',
    'formatted_address',
    'address',
    'label',
    'name',
  ])
  if (singleLine) return singleLine
  const city = readStringField(obj, ['city', 'town', 'locality'])
  const region = readStringField(obj, ['region', 'state', 'province'])
  const countryName = readStringField(obj, ['country', 'country_name'])
  const countryCode = readStringField(obj, ['countryCode', 'country_code', 'countryISO', 'country_iso'])
  const country = countryName || countryFromCode(countryCode)
  return [city || region, country].filter(Boolean).join(', ') || country || city || region || null
}

function locationEntryHeadquartersPriority(loc: unknown): number {
  if (!loc || typeof loc !== 'object') return 0
  const t = String((loc as Record<string, unknown>).type ?? (loc as Record<string, unknown>).kind ?? '').toLowerCase()
  if (t.includes('head') || t.includes('hq') || t.includes('primary') || t.includes('main')) return 3
  if (t.includes('office')) return 1
  return 2
}

function pickHeadquartersFromLocationsArray(locations: unknown[] | undefined): string | null {
  if (!Array.isArray(locations) || locations.length === 0) return null
  const parsed = locations.map((loc) => ({
    text: parseHeadquartersFromUnknown(loc),
    prio: locationEntryHeadquartersPriority(loc),
  }))
  parsed.sort((a, b) => b.prio - a.prio)
  for (const p of parsed) {
    const s = String(p.text ?? '').trim()
    if (s) return s
  }
  return null
}

function pickHeadquartersFromBrandfetchJson(
  json: {
    company?: {
      location?: unknown
      headquarters?: unknown
      locations?: unknown
    } | null
    headquarters?: unknown
    location?: unknown
    locations?: unknown
  },
  domain: string
): string | null {
  const candidates: Array<string | null> = []
  candidates.push(parseHeadquartersFromUnknown(json.company?.location))
  candidates.push(parseHeadquartersFromUnknown(json.company?.headquarters))
  candidates.push(parseHeadquartersFromUnknown(json.headquarters))
  candidates.push(parseHeadquartersFromUnknown(json.location))

  const companyLocations = Array.isArray(json.company?.locations) ? json.company?.locations : []
  candidates.push(pickHeadquartersFromLocationsArray(companyLocations))
  const rootLocations = Array.isArray(json.locations) ? json.locations : []
  candidates.push(pickHeadquartersFromLocationsArray(rootLocations))

  for (const c of candidates) {
    const s = String(c ?? '').trim()
    if (s) return s
  }
  return countryFromDomainTld(domain)
}

async function fetchHeadquartersFallbackByName(companyName: string, domain: string): Promise<string | null> {
  const cleanedName = String(companyName ?? '').trim()
  if (!cleanedName) return null
  const country = countryFromDomainTld(domain)
  const q = `${cleanedName} headquarters${country ? ` ${country}` : ''}`
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`,
      {
        headers: {
          'User-Agent': 'RefStack/1.0 (sales dashboard enrichment)',
          Accept: 'application/json',
        },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return null
    const json = (await res.json()) as Array<{ address?: Record<string, unknown> }>
    const first = json[0]
    const address = first?.address ?? null
    const city = readStringField(address, ['city', 'town', 'village', 'municipality'])
    const countryName = readStringField(address, ['country'])
    const out = [city, countryName].filter(Boolean).join(', ') || countryName || city || null
    return out ? String(out).trim() : null
  } catch {
    return null
  }
}

type BrandfetchLogoJson = {
  theme?: string | null
  type?: string | null
  formats?: { src?: string | null; format?: string | null; width?: number | null }[]
}

/** Alle Logo-URLs aus Brandfetch (svg/png bevorzugt, Reihenfolge = Priorität). */
export function listLogoUrlsFromBrandfetchJson(json: {
  logos?: BrandfetchLogoJson[] | null
}): string[] {
  const candidates: string[] = []
  for (const logo of json.logos ?? []) {
    const formats = [...(logo.formats ?? [])].sort((a, b) => {
      const score = (f: typeof a) => {
        const fmt = String(f?.format ?? '').toLowerCase()
        if (fmt === 'svg') return 0
        if (fmt === 'png') return 1
        return 2
      }
      return score(a) - score(b)
    })
    for (const fmt of formats) {
      const src = String(fmt?.src ?? '').trim()
      if (src.startsWith('http')) candidates.push(src)
    }
  }
  return candidates
}

/** Bestes Logo; optional defekte URL überspringen und nächstes Format wählen. */
export function pickBestLogoUrlFromBrandfetchJson(
  json: { logos?: BrandfetchLogoJson[] | null },
  excludeUrl?: string | null
): string | null {
  const candidates = listLogoUrlsFromBrandfetchJson(json)
  const exclude = String(excludeUrl ?? '').trim()
  if (exclude) {
    const alt = candidates.find((url) => url !== exclude)
    if (alt) return alt
  }
  return candidates[0] ?? null
}

/** Brandfetch-Domain-Lookup (z. B. Bulk-Import, Cron). */
export async function fetchBrandfetchCompany(
  domain: string,
  options?: { excludeLogoUrl?: string | null }
): Promise<
  | { success: true; data: BrandfetchCompanyPayload }
  | { success: false; status?: number }
> {
  const apiKey = process.env.BRANDFETCH_API_KEY
  if (!apiKey) return { success: false, status: 0 }

  let res: Response
  try {
    res = await fetch(`https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
  } catch {
    return { success: false }
  }
  if (!res.ok) return { success: false, status: res.status }

  let json: {
    name?: string | null
    brand?: string | null
    domain?: string | null
    description?: string | null
    company?: {
      employees?: number | null
      industries?: { name?: string | null }[]
      location?: unknown
      headquarters?: unknown
      locations?: unknown
    }
    headquarters?: unknown
    location?: unknown
    locations?: unknown
    logos?: { formats?: { src?: string | null }[] }[]
    industries?: { name?: string | null }[]
  }
  try {
    json = await res.json()
  } catch {
    return { success: false }
  }

  const rawName = String(json.name ?? json.brand ?? '').trim()
  const headquarters = pickHeadquartersFromBrandfetchJson(json, domain)
  const logoUrl = pickBestLogoUrlFromBrandfetchJson(json, options?.excludeLogoUrl)
  const websiteDomain = String(json.domain ?? domain).trim()
  const industries =
    json.company?.industries?.length ? json.company.industries : json.industries
  const data: BrandfetchCompanyPayload = {
    companyName: rawName || null,
    websiteUrl: websiteDomain ? `https://${normalizeDomain(websiteDomain)}` : `https://${domain}`,
    logoUrl: logoUrl || null,
    industry: mapBrandfetchIndustriesArrayToGermanCategory(industries),
    headquarters,
    employeeCount: typeof json.company?.employees === 'number' ? json.company.employees : null,
    description: String(json.description ?? '').trim() || null,
  }
  return { success: true, data }
}

export type StaleCompanyBrandfetchRow = {
  id: string
  name: string | null
  website_url: string | null
  logo_url: string | null
  industry: string | null
  headquarters: string | null
  employee_count: number | null
  description: string | null
  brandfetch_synced_at?: string | null
}

export type BrandfetchStaleRefreshResult = {
  processedCount: number
  updatedCount: number
  syncedOnlyCount: number
  skippedCount: number
  failedCount: number
  error?: string
}

/**
 * Geplanter Abgleich: Accounts mit Brandfetch anreichern (HQ, Logo, MA-Zahl, …).
 * `scheduledStaleRefresh`: bei erfolgreichem API-Call werden Logo/HQ/MA-Zahl aus der API übernommen (wenn vorhanden),
 * Branche nur wie bisher bei leerer/generischer Branche. `brandfetch_synced_at` wird bei Erfolg gesetzt.
 */
export async function refreshCompanyRowFromBrandfetch(
  supabase: SupabaseClient,
  company: StaleCompanyBrandfetchRow,
  options: { scheduledStaleRefresh: boolean }
): Promise<'updated' | 'synced_only' | 'skipped' | 'failed'> {
  const scheduled = options.scheduledStaleRefresh
  const website = String(company.website_url ?? '').trim()
  const domain = inputToDomain(website)
  if (!domain) return 'skipped'

  const fetched = await fetchBrandfetchCompany(domain)
  if (!fetched.success) return 'failed'

  const currentIndustry = normalizeTextValue(company.industry)
  const fetchedIndustry = String(fetched.data.industry ?? '').trim()
  const fetchedIndustryNorm = normalizeTextValue(fetchedIndustry)
  const industryLooksGeneric =
    currentIndustry === 'sonstige' ||
    currentIndustry === 'other' ||
    currentIndustry === 'unknown' ||
    currentIndustry === 'n/a'
  const industryNeedsUpdate =
    Boolean(fetchedIndustryNorm) && (industryLooksGeneric || !currentIndustry)

  const currentHeadquarters = normalizeTextValue(company.headquarters)
  let fetchedHeadquarters = String(fetched.data.headquarters ?? '').trim()
  if (!fetchedHeadquarters && !currentHeadquarters) {
    const fallbackHq = await fetchHeadquartersFallbackByName(String(company.name ?? ''), domain)
    if (fallbackHq) fetchedHeadquarters = fallbackHq
  }
  const fetchedHeadquartersNorm = normalizeTextValue(fetchedHeadquarters)

  const headquartersNeedsUpdate = Boolean(fetchedHeadquartersNorm) && (
    scheduled ||
    !currentHeadquarters ||
    fetchedHeadquartersNorm !== currentHeadquarters
  )

  const currentLogo = String(company.logo_url ?? '').trim()
  const fetchedLogo = String(fetched.data.logoUrl ?? '').trim()
  const logoNeedsUpdate = Boolean(fetchedLogo) && (scheduled || fetchedLogo !== currentLogo)

  const employeeFromApi =
    typeof fetched.data.employeeCount === 'number' && Number.isFinite(fetched.data.employeeCount)
      ? fetched.data.employeeCount
      : null
  const employeeNeedsUpdate =
    employeeFromApi != null &&
    (scheduled || company.employee_count == null || company.employee_count !== employeeFromApi)

  // Beim Cron keine Überschreibung bestehender Beschreibung — nur auffüllen wie beim manuellen Refresh.
  const fillDescription = !company.description && Boolean(fetched.data.description)
  const descriptionForPayload = fillDescription ? fetched.data.description : company.description

  const websiteNeedsUpdate = !website && Boolean(fetched.data.websiteUrl)

  const hasMeaningfulChange =
    logoNeedsUpdate ||
    industryNeedsUpdate ||
    headquartersNeedsUpdate ||
    employeeNeedsUpdate ||
    fillDescription ||
    websiteNeedsUpdate

  const iso = new Date().toISOString()

  if (!hasMeaningfulChange && !scheduled) {
    return 'skipped'
  }

  if (!hasMeaningfulChange && scheduled) {
    const { error } = await supabase
      .from('companies')
      .update({ brandfetch_synced_at: iso, updated_at: iso })
      .eq('id', company.id)
    return error ? 'failed' : 'synced_only'
  }

  const payload = {
    logo_url: logoNeedsUpdate ? fetched.data.logoUrl : company.logo_url,
    industry: industryNeedsUpdate ? fetched.data.industry : company.industry,
    headquarters: headquartersNeedsUpdate ? fetchedHeadquarters.trim() || company.headquarters : company.headquarters,
    employee_count:
      employeeNeedsUpdate && employeeFromApi != null ? employeeFromApi : company.employee_count,
    description: descriptionForPayload,
    website_url: website || fetched.data.websiteUrl,
    name: String(company.name ?? '').trim() || fetched.data.companyName || 'Unbekannt',
    brandfetch_synced_at: iso,
    updated_at: iso,
  }

  const { error: updateError } = await supabase.from('companies').update(payload).eq('id', company.id)
  return updateError ? 'failed' : 'updated'
}

/**
 * Lädt bis zu `maxCompanies` Accounts, deren letzter Brandfetch-Abgleich fehlt oder älter als `staleAfterDays` ist,
 * und aktualisiert sie nacheinander (Service-Role-Client).
 */
export async function runBrandfetchStaleAccountsRefresh(
  supabase: SupabaseClient,
  opts: { maxCompanies: number; staleAfterDays: number }
): Promise<BrandfetchStaleRefreshResult> {
  const thresholdMs = Date.now() - opts.staleAfterDays * 86400000
  const thresholdIso = new Date(thresholdMs).toISOString()

  const safeIso = thresholdIso.replace(/"/g, '')
  const { data: rows, error } = await supabase
    .from('companies')
    .select('id,name,website_url,logo_url,industry,headquarters,employee_count,description,brandfetch_synced_at')
    .or(`brandfetch_synced_at.is.null,brandfetch_synced_at.lt."${safeIso}"`)
    .order('brandfetch_synced_at', { ascending: true, nullsFirst: true })
    .limit(opts.maxCompanies)

  if (error) {
    return {
      processedCount: 0,
      updatedCount: 0,
      syncedOnlyCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: error.message,
    }
  }

  let updatedCount = 0
  let syncedOnlyCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const row of rows ?? []) {
    const company = row as StaleCompanyBrandfetchRow
    const outcome = await refreshCompanyRowFromBrandfetch(supabase, company, { scheduledStaleRefresh: true })
    if (outcome === 'updated') updatedCount += 1
    else if (outcome === 'synced_only') syncedOnlyCount += 1
    else if (outcome === 'skipped') skippedCount += 1
    else if (outcome === 'failed') failedCount += 1
  }

  return {
    processedCount: (rows ?? []).length,
    updatedCount,
    syncedOnlyCount,
    skippedCount,
    failedCount,
  }
}
