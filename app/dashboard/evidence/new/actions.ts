'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { submitForApproval } from '../actions'

// Mapping für Brandfetch → Formular (Industrie-Dropdown, deutsch)
const INDUSTRIES_MAP: { keywords: string[]; value: string }[] = [
  { keywords: ['finance', 'finanz', 'banking', 'insurance', 'versicherung'], value: 'Finanzdienstleistungen & Versicherung' },
  { keywords: ['retail', 'handel', 'ecommerce', 'consumer', 'cpg'], value: 'Handel & Konsumgüter' },
  { keywords: ['manufacturing', 'industrie', 'production', 'automotive', 'engineering'], value: 'Industrie & Automotive' },
  { keywords: ['software', 'it ', 'technology', 'tech', 'internet', 'computer', 'media', 'telecom', 'tmt'], value: 'Technologie, Medien & Telekommunikation' },
  { keywords: ['energy', 'utilities', 'resources', 'oil', 'gas', 'mining'], value: 'Energie, Rohstoffe & Versorgung' },
  { keywords: ['health', 'gesundheit', 'medical', 'pharma', 'life sciences'], value: 'Gesundheitswesen & Life Sciences' },
  { keywords: ['government', 'public', 'öffentlich', 'defence', 'administration', 'education'], value: 'Öffentlicher Sektor & Bildung' },
  { keywords: ['professional services', 'consulting', 'logistics'], value: 'Beratung & Logistik' },
  { keywords: ['travel', 'transport', 'hospitality', 'tourism'], value: 'Reise, Transport & Gastgewerbe' },
]
const INDUSTRY_DEFAULT = 'Sonstige'

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

export type CompanySearchSuggestion = { id: string; name: string; logo_url?: string | null }

export type CompanySearchResult =
  | { success: true; suggestions: CompanySearchSuggestion[] }
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

function mapBrandfetchIndustry(name: string | undefined): string | null {
  if (!name) return null
  const lower = name.toLowerCase()
  for (const { keywords, value } of INDUSTRIES_MAP) {
    if (keywords.some((k) => lower.includes(k))) return value
  }
  return INDUSTRY_DEFAULT
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

/** Sucht Unternehmensvorschläge für die Combobox (lokal in der Organisation, optional erweitert um Brandfetch-Daten). */
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

  const pattern = `%${query}%`

  // 1. Schnelle Suche in bestehenden Companies der Organisation
  const { data: companies, error } = await supabase
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

  let suggestions: CompanySearchSuggestion[] = (companies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    logo_url: (c as { logo_url?: string | null }).logo_url ?? null,
  }))

  // 2. Falls lokal nichts gefunden wurde, optional Brandfetch-Daten als Einzeltreffer vorschlagen
  if (suggestions.length === 0) {
    const domain = inputToDomain(query) ?? normalizeDomain(query)
    if (domain && domain.includes('.')) {
      const fetched = await fetchBrandfetchData(domain)
      if (fetched.success) {
        suggestions = [
          {
            id: `brandfetch:${domain}`,
            name: fetched.company_name,
            logo_url: fetched.logo_url,
          },
        ]
      }
    }
  }

  return { success: true, suggestions }
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

  const normalizedDomain = inputToDomain(domain) ?? normalizeDomain(domain)
  if (!normalizedDomain || !normalizedDomain.includes('.')) {
    return { success: false, error: 'Bitte eine Domain (z. B. bmw.de) oder einen Firmennamen (z. B. BMW) eingeben.' }
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
    revalidatePath('/dashboard/evidence/new')
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
  revalidatePath('/dashboard/evidence/new')
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
    logos?: { formats?: { src?: string }[] }[]
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
  const firstIndustry = data.company?.industries?.[0]?.name
  const industry = mapBrandfetchIndustry(firstIndustry)
  const loc = data.company?.location
  const headquarters = [loc?.city, loc?.country].filter(Boolean).join(', ') || null
  const country = mapBrandfetchCountry(loc?.country, loc?.countryCode)
  const logoUrl =
    data.logos?.[0]?.formats?.[0]?.src ?? data.logos?.find((l) => l.formats?.length)?.formats?.[0]?.src ?? null

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
export async function fetchCompanyEnrichment(input: string): Promise<FetchEnrichmentResult> {
  const domain = inputToDomain(input) ?? normalizeDomain(input)
  if (!domain || !domain.includes('.')) {
    return { success: false, error: 'Bitte eine Domain (z. B. bmw.de) oder einen Firmennamen (z. B. BMW) eingeben.' }
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
  const summary = formData.get('summary')?.toString()?.trim()
  const industry = formData.get('industry')?.toString()?.trim() || null
  const country = formData.get('country')?.toString()?.trim() || null
  const contactIdRaw = formData.get('contactId')?.toString()?.trim() || null
  const contactId =
    contactIdRaw && contactIdRaw !== '__none__' ? contactIdRaw : null
  const statusRaw = formData.get('status')?.toString()
  const tags = formData.get('tags')?.toString()?.trim() || null
  const website = formData.get('website')?.toString()?.trim() || null
  const employeeCountRaw = formData.get('employee_count')?.toString()?.trim() || null
  const employee_count =
    employeeCountRaw && !Number.isNaN(Number(employeeCountRaw))
      ? Math.max(0, Math.trunc(Number(employeeCountRaw)))
      : null
  const volume_eur = formData.get('volume_eur')?.toString()?.trim() || null
  const contract_type = formData.get('contract_type')?.toString()?.trim() || null
  const incumbent_provider = formData.get('incumbent_provider')?.toString()?.trim() || null
  const competitors = formData.get('competitors')?.toString()?.trim() || null
  const customer_challenge = formData.get('customer_challenge')?.toString()?.trim() || null
  const our_solution = formData.get('our_solution')?.toString()?.trim() || null
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
  if (!contactId) {
    return { success: false, error: 'Ansprechpartner intern ist erforderlich.' }
  }
  if (!project_status) {
    return { success: false, error: 'Projektstatus ist erforderlich.' }
  }
  if (!project_start) {
    return { success: false, error: 'Projektstart ist erforderlich.' }
  }
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
    let nameToUse = newCompanyName?.trim()
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

  const file = formData.get('file') as File | null

  const { data: reference, error: refError } = await supabase
    .from('references')
    .insert({
      company_id: resolvedCompanyId,
      title,
      summary: summary || null,
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

  // Original-Dokument in den Storage hochladen (falls vorhanden)
  if (file && file.size > 0) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const storagePath = `${organizationId}/${reference.id}/${Date.now()}-${safeName}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('references')
        .upload(storagePath, file)
      if (uploadError) {
        console.error('[createReference] Upload fehlgeschlagen:', uploadError.message)
      } else if (uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('references')
          .getPublicUrl(uploadData.path)
        const originalUrl = publicUrlData?.publicUrl ?? null
        const { error: updateFileError } = await supabase
          .from('references')
          .update({
            file_path: uploadData.path,
            original_document_url: originalUrl,
          })
          .eq('id', reference.id)
        if (updateFileError) {
          console.error('[createReference] Konnte file_path/original_document_url nicht speichern:', updateFileError.message)
        }
      }
    } catch (e) {
      console.error('[createReference] Unerwarteter Fehler beim Upload des Originaldokuments:', e)
    }
  }

  // KAN-23: Embedding für semantische Suche (Best Effort – Fehler blockieren die Referenz nicht; Backfill: KAN-22)
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const combinedParts = [
      title,
      summary,
      customer_challenge,
      our_solution,
      industry,
    ]
      .filter((p): p is string => !!p && p.trim().length > 0)
      .map((p) => p.trim())

    if (apiKey && combinedParts.length > 0) {
      const input = combinedParts.join('\n\n')
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input,
        }),
      })

      if (!response.ok) {
        const raw = await response.text()
        console.error('[createReference] Embedding-API Fehler:', response.status, raw)
      } else {
        const json = (await response.json()) as { data?: Array<{ embedding: number[] }> }
        const vector = json.data?.[0]?.embedding
        if (Array.isArray(vector) && vector.length > 0) {
          const { error: embedError } = await supabase
            .from('references')
            .update({ embedding: vector })
            .eq('id', reference.id)
          if (embedError) {
            console.error('[createReference] Konnte Embedding nicht speichern:', embedError.message)
          }
        }
      }
    }
  } catch (e) {
    console.error('[createReference] Unerwarteter Fehler beim Erzeugen des Embeddings:', e)
  }

  // Freigabe-Anfragen werden im 4-Status-Modell explizit ausgelöst,
  // daher wird der Status hier nicht mehr automatisch auf einen Zwischenstatus gesetzt.

  revalidatePath('/dashboard')
  return { success: true, referenceId: reference.id }
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

  revalidatePath('/dashboard/evidence/new')
  revalidatePath('/dashboard/evidence/[id]/edit', 'page')

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

  revalidatePath('/dashboard/evidence/new')
  revalidatePath('/dashboard/evidence/[id]/edit', 'page')

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
  revalidatePath('/dashboard/evidence/new')
  revalidatePath('/dashboard/evidence/[id]/edit', 'page')
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
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      role: role || null,
      phone: phone || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/evidence/new')
  revalidatePath('/dashboard/evidence/[id]/edit', 'page')
  return { success: true }
}
