'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { REVALIDATE, ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference, revalidateOrgCompanies, revalidateOrgReferences } from '@/lib/cache/revalidate-org'
import { narrativeFieldLengthError } from '@/lib/references/reference-narrative-limits'
import { resolveDomainForCompanyName } from '@/lib/accounts/resolve-company-for-import'
import { fetchBrandfetchCompany, pickBestLogoUrlFromBrandfetchJson } from '@/lib/accounts/brandfetch-accounts-refresh'
import {
  ensureBrandfetchDarkLogoUrl,
  rewriteBrandfetchLogoUrlForLightBackground,
} from '@/lib/brandfetch/logo-theme-url'
import { mapBrandfetchIndustriesArrayToGermanCategory } from '@/lib/brandfetch/map-brandfetch-industry-to-de'
import {
  discoverAndSaveCompanyNewsrooms,
  scheduleCompanyNewsroomDiscovery,
} from '@/lib/market-signals/discover-company-newsroom'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import { normalizeContractType } from '@/lib/references/contract-type'
import { extractDataFromDocument } from '@/lib/document-extraction'
import { parseGermanEmployeeCountInput } from '@/lib/format'
import type { ExtractDataFromDocumentResult } from './types'

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

export type EnrichCompanyResult =
  | {
      success: true
      company_id: string
      company_name: string
      website_url: string | null
      industry: string | null
      headquarters: string | null
      country: string | null
      employee_count: number | null
      logo_url: string | null
    }
  | { success: false; error: string }

/** Nur Abfrage – keine DB-Schreiboperation. Für Bearbeiten-Formular. */
export type FetchEnrichmentResult =
  | { success: true; company_name: string; website_url: string | null; industry: string | null; headquarters: string | null; country: string | null; employee_count: number | null; logo_url: string | null; description: string | null }
  | { success: false; error: string }

export type CompanySearchSuggestion = {
  id: string
  name: string
  logo_url?: string | null
  /** Quelle für die Anzeige in Autocomplete-Listen */
  source?: 'local' | 'brandfetch'
}

export type CompanySearchResult =
  | { success: true; suggestions: CompanySearchSuggestion[]; hint?: string }
  | { success: false; error: string }

function normalizeDomain(input: string): string {
  const t = input.trim().toLowerCase()
  const withoutProtocol = t.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return withoutProtocol || t
}

/** Leitet eine Domain aus der Eingabe ab: "siemens.de" → "siemens.de", "BMW" → "bmw.com" */
function inputToDomain(input: string): string | null {
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
function looksLikeDomain(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t || t.includes(' ')) return false
  return /\.(com|de|net|org|io|eu|co|ai|cloud|global)$/i.test(t) || /\.[a-z]{2,}$/i.test(t)
}

/** Konvertiert Domain zu lesbarem Namen: TLD entfernen, großschreiben (z. B. "biontechse.com" → "Biontechse"). */
function domainToDisplayName(domain: string): string {
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
      console.error('brandfetchSuggestionsForQuery search API:', e)
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
export async function searchCompanySuggestions(input: string): Promise<CompanySearchResult> {
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
      console.error('searchCompanySuggestions companies error:', error)
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

/** Server Action: KI-Import aus PDF/DOCX/PPTX (für das Referenz-Formular im Client). */
export async function extractReferenceDocumentFromUpload(
  formData: FormData
): Promise<ExtractDataFromDocumentResult> {
  return extractDataFromDocument(formData)
}

export async function enrichAndSaveCompany(domain: string): Promise<EnrichCompanyResult> {
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

export async function fetchCompanyEnrichment(input: string): Promise<FetchEnrichmentResult> {
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

export type CreateReferenceResult =
  | { success: true; referenceId: string }
  | { success: false; error: string }

const REFERENCE_STATUSES = [
  'draft',
  'internal_only',
  'approved',
  'anonymized',
] as const

export async function createReference(
  formData: FormData
): Promise<CreateReferenceResult> {
  const companyId = formData.get('companyId')?.toString()
  const newCompanyName = formData.get('newCompanyName')?.toString()?.trim()
  const title = formData.get('title')?.toString()?.trim()
  const summary = normalizeNarrativeText(formData.get('summary')?.toString())
  const industry = formData.get('industry')?.toString()?.trim() || null
  const country = formData.get('country')?.toString()?.trim() || null
  const contactIdRaw = formData.get('contactId')?.toString()?.trim() || null
  const contactId =
    contactIdRaw && contactIdRaw !== '__none__' ? contactIdRaw : null
  const statusRaw = formData.get('status')?.toString()
  const tags = formData.get('tags')?.toString()?.trim() || null
  const website = formData.get('website')?.toString()?.trim() || null
  const employeeCountRaw = formData.get('employee_count')?.toString()?.trim() || null
  const employee_count = parseGermanEmployeeCountInput(employeeCountRaw)
  const companyHeadquarters = formData.get('company_headquarters')?.toString()?.trim() || null
  const companyLogoUrlRaw = formData.get('company_logo_url')?.toString()?.trim() || null
  const company_logo_url = companyLogoUrlRaw
    ? ensureBrandfetchDarkLogoUrl(companyLogoUrlRaw) ?? companyLogoUrlRaw
    : null
  const volume_eur = formData.get('volume_eur')?.toString()?.trim() || null
  const contract_type = normalizeContractType(formData.get('contract_type')?.toString())
  const incumbent_provider = formData.get('incumbent_provider')?.toString()?.trim() || null
  const competitors = formData.get('competitors')?.toString()?.trim() || null
  const customer_challenge = normalizeNarrativeText(formData.get('customer_challenge')?.toString())
  const our_solution = normalizeNarrativeText(formData.get('our_solution')?.toString())
  const customer_contact = formData.get('customer_contact')?.toString()?.trim() || null
  const customer_contact_id_raw = formData.get('customer_contact_id')?.toString()?.trim() || null
  const customer_contact_id =
    customer_contact_id_raw && customer_contact_id_raw !== '__none__' ? customer_contact_id_raw : null
  const projectStatusRaw = formData.get('project_status')?.toString()
  const project_status: 'active' | 'completed' | null =
    projectStatusRaw === 'active' || projectStatusRaw === 'completed'
      ? projectStatusRaw
      : null
  const project_start = formData.get('project_start')?.toString()?.trim() || null
  const project_end = formData.get('project_end')?.toString()?.trim() || null
  const ndaDealRaw = formData.get('nda_deal')?.toString()
  const is_nda_deal = ndaDealRaw === '1' || ndaDealRaw === 'true'

  if (!title) {
    return { success: false, error: 'Titel ist erforderlich.' }
  }

  const summaryLenErr = narrativeFieldLengthError(formData.get('summary')?.toString(), 'Zusammenfassung')
  if (summaryLenErr) return { success: false, error: summaryLenErr }
  const challengeLenErr = narrativeFieldLengthError(
    formData.get('customer_challenge')?.toString(),
    'Herausforderung'
  )
  if (challengeLenErr) return { success: false, error: challengeLenErr }
  const solutionLenErr = narrativeFieldLengthError(formData.get('our_solution')?.toString(), 'Lösung')
  if (solutionLenErr) return { success: false, error: solutionLenErr }

  // NOTE: Diese Felder sind in der DB optional. UI kann sie später nachpflegen,
  // daher blockieren wir das Speichern hier nicht.
  if (project_status === 'completed' && !project_end) {
    return { success: false, error: 'Bei abgeschlossenem Projekt ist das Projektende erforderlich.' }
  }

  const submitMode = formData.get('submitMode')?.toString()
  const rawStatus = REFERENCE_STATUSES.includes(
    statusRaw as (typeof REFERENCE_STATUSES)[number]
  )
    ? (statusRaw as (typeof REFERENCE_STATUSES)[number])
    : 'draft'
  const status =
    submitMode === 'draft'
      ? 'draft'
      : rawStatus

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
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet. Bitte Einstellungen prüfen.' }
  }

  let resolvedCompanyId: string
  let createdCompanyId: string | null = null

  if (companyId && companyId !== '__new__') {
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single()

    if (fetchError || !company) {
      return { success: false, error: 'Unternehmen nicht gefunden.' }
    }
    resolvedCompanyId = company.id
  } else {
    const nameToUse = newCompanyName?.trim()
    if (!nameToUse) {
      return { success: false, error: 'Bitte Firmennamen eingeben oder ein Unternehmen wählen.' }
    }
    const normalizedDomainForMatch = normalizeDomain(nameToUse)
    const displayName = looksLikeDomain(nameToUse) ? domainToDisplayName(nameToUse) : nameToUse

    // 1) Prüfen, ob die Firma bereits existiert: nach Name (case-insensitive) ODER Domain (website_url)
    const { data: existingByName, error: existingError } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('name', nameToUse)
      .maybeSingle()

    if (existingError) {
      return { success: false, error: existingError.message }
    }

    let existingCompany = existingByName
    if (!existingCompany?.id && normalizedDomainForMatch.includes('.')) {
      const { data: existingByDomain } = await supabase
        .from('companies')
        .select('id')
        .eq('organization_id', organizationId)
        .ilike('website_url', `%${normalizedDomainForMatch}%`)
        .limit(1)
        .maybeSingle()
      existingCompany = existingByDomain ?? null
    }

    if (existingCompany?.id) {
      resolvedCompanyId = existingCompany.id
    } else {
      // 2) Neue Firma anlegen (lesbarer Name, falls Eingabe eine Domain war)
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert({
          name: displayName,
          industry: industry ?? undefined,
          organization_id: organizationId,
          website_url: website || null,
          employee_count: employee_count,
          headquarters: companyHeadquarters,
          logo_url: company_logo_url,
        })
        .select('id')
        .single()

      if (insertError) {
        if ((insertError as { code?: string }).code === '23505') {
          const { data: c1 } = await supabase.from('companies').select('id').eq('organization_id', organizationId).ilike('name', displayName).maybeSingle()
          const conflictCompany = c1 ?? (await supabase.from('companies').select('id').eq('organization_id', organizationId).ilike('name', nameToUse).maybeSingle()).data
          if (conflictCompany?.id) {
            resolvedCompanyId = conflictCompany.id
          } else {
            return { success: false, error: insertError.message }
          }
        } else {
          return { success: false, error: insertError.message }
        }
      } else {
        if (!newCompany?.id) {
          return { success: false, error: 'Firma konnte nicht angelegt werden.' }
        }
        resolvedCompanyId = newCompany.id
        createdCompanyId = newCompany.id
      }
    }
  }

  const { data: reference, error: refError } = await supabase
    .from('references')
    .insert({
      company_id: resolvedCompanyId,
      title,
      summary,
      industry,
      country,
      website,
      employee_count,
      volume_eur,
      contract_type,
      incumbent_provider,
      competitors,
      customer_challenge,
      our_solution,
      customer_contact,
      customer_contact_id,
      contact_id: contactId,
      status,
      file_path: null,
      tags,
      project_status,
      project_start: project_start || null,
      project_end: project_end || null,
      is_nda_deal,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (refError || !reference?.id) {
    // Falls in diesem Request eine neue Firma angelegt wurde, aber die Referenz fehlschlägt:
    // Firma wieder aufräumen, damit keine verwaisten Einträge entstehen.
    if (createdCompanyId) {
      await supabase.from('companies').delete().eq('id', createdCompanyId)
    }
    if (refError) {
      return { success: false, error: refError.message }
    }
    return { success: false, error: 'Referenz konnte nicht gespeichert werden.' }
  }

  // Guardrail H7: Kundenzitat nur im Freigabe-Flow (approval-decision-form / generate-approval-quote),
  // nicht im Anlege- oder Bearbeitungsformular.

  // Original-Dokument Upload läuft client-seitig im Hintergrund, damit Speichern instant ist.
  // attachOriginalDocumentToReference verknüpft Storage-Pfad + reference_assets.

  // Embeddings werden non-blocking im Hintergrund erzeugt (EPIC 3: Trigger + Edge Function).

  // Freigabe-Anfragen werden im 4-Status-Modell explizit ausgelöst,
  // daher wird der Status hier nicht mehr automatisch auf einen Zwischenstatus gesetzt.

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.root)
  revalidateOrgReferences(organizationId)
  return { success: true, referenceId: reference.id }
}

export async function attachOriginalDocumentToReference(params: {
  referenceId: string
  file_path: string
  original_document_url: string | null
  file_name?: string | null
  file_type?: string | null
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const referenceId = String(params.referenceId ?? '').trim()
  const file_path = String(params.file_path ?? '').trim()
  if (!referenceId || !file_path) {
    return { success: false, error: 'Ungültige Parameter.' }
  }

  const file_name =
    String(params.file_name ?? '').trim() || file_path.split('/').pop() || 'document'
  const file_type = params.file_type?.trim() || null

  const { data: existingAsset } = await supabase
    .from('reference_assets')
    .select('id')
    .eq('reference_id', referenceId)
    .eq('file_path', file_path)
    .maybeSingle()

  if (!existingAsset?.id) {
    const { error: assetErr } = await supabase.from('reference_assets').insert({
      reference_id: referenceId,
      file_path,
      file_name,
      file_type,
      category: 'other',
    })
    if (assetErr) return { success: false, error: assetErr.message }
  }

  const { error } = await supabase
    .from('references')
    .update({
      file_path,
      original_document_url: params.original_document_url,
    })
    .eq('id', referenceId)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.references.root)
  revalidatePath(ROUTES.references.edit(referenceId))
  await revalidateOrgCachesForReference(referenceId)
  return { success: true }
}

export async function createContact(formData: FormData) {
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

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const email = formData.get('email')?.toString()?.trim()

  if (!firstName || !lastName || !email) {
    return { success: false, error: 'Alle Felder sind erforderlich.' }
  }

  const normalizedEmail = email.toLowerCase()
  const { data: existing } = await supabase
    .from('contact_persons')
    .select('id, first_name, last_name, email')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { success: true, contact: existing }
  }

  const { data, error } = await supabase
    .from('contact_persons')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      organization_id: organizationId,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')

  return { success: true, contact: data }
}

export type ExternalContact = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone?: string | null
}

export async function createExternalContact(
  formData: FormData
): Promise<{ success: false; error: string } | { success: true; contact: ExternalContact }> {
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

  const companyId = formData.get('companyId')?.toString()?.trim()
  if (!companyId) {
    return { success: false, error: 'Bitte zuerst ein Unternehmen auswählen.' }
  }

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const email = formData.get('email')?.toString()?.trim()
  const role = formData.get('role')?.toString()?.trim() || null
  const phone = formData.get('phone')?.toString()?.trim() || null

  if (!firstName || !lastName || !email) {
    return { success: false, error: 'Vorname, Nachname und E-Mail sind erforderlich.' }
  }

  const { data, error } = await supabase
    .from('external_contacts')
    .insert({
      organization_id: organizationId,
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      phone,
    })
    .select('id, company_id, first_name, last_name, email, role, phone')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')

  return {
    success: true,
    contact: {
      id: data.id,
      company_id: data.company_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      role: data.role,
      phone: data.phone ?? null,
    },
  }
}

export async function updateContact(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const firstName = formData.get('firstName')?.toString()?.trim() ?? ''
  const lastName = formData.get('lastName')?.toString()?.trim() ?? ''
  const email = formData.get('email')?.toString()?.trim() ?? ''
  const phone = formData.get('phone')?.toString()?.trim() ?? ''

  const { error } = await supabase
    .from('contact_persons')
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')
  return { success: true }
}

export async function updateExternalContact(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const firstName = formData.get('firstName')?.toString()?.trim() ?? ''
  const lastName = formData.get('lastName')?.toString()?.trim() ?? ''
  const email = formData.get('email')?.toString()?.trim() ?? ''
  const role = formData.get('role')?.toString()?.trim() ?? ''
  const phone = formData.get('phone')?.toString()?.trim() ?? ''

  const { error } = await supabase
    .from('external_contacts')
    .update({
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      role: role || undefined,
      phone: phone || undefined,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')
  return { success: true }
}
