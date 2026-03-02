'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { submitForApproval } from '../actions'

// Mapping für Brandfetch → Formular (Industrie-Dropdown)
const INDUSTRIES_MAP: { keywords: string[]; value: string }[] = [
  { keywords: ['software', 'it ', 'technology', 'tech', 'internet', 'computer'], value: 'IT & Software' },
  { keywords: ['finance', 'finanz', 'banking', 'insurance', 'versicherung'], value: 'Finanzdienstleistungen' },
  { keywords: ['health', 'gesundheit', 'medical', 'pharma'], value: 'Gesundheitswesen' },
  { keywords: ['manufacturing', 'industrie', 'production', 'automotive', 'engineering'], value: 'Industrie & Produktion' },
  { keywords: ['retail', 'handel', 'ecommerce', 'consumer'], value: 'Handel' },
  { keywords: ['government', 'public', 'öffentlich', 'defence', 'administration'], value: 'Öffentlicher Sektor' },
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

export type EnrichCompanyResult =
  | { success: true; company_id: string; company_name: string; website_url: string | null; industry: string | null; headquarters: string | null; country: string | null; employee_count: number | null; logo_url: string | null }
  | { success: false; error: string }

function normalizeDomain(input: string): string {
  const t = input.trim().toLowerCase()
  const withoutProtocol = t.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return withoutProtocol || t
}

function mapBrandfetchIndustry(name: string | undefined): string | null {
  if (!name) return null
  const lower = name.toLowerCase()
  for (const { keywords, value } of INDUSTRIES_MAP) {
    if (keywords.some((k) => lower.includes(k))) return value
  }
  return INDUSTRY_DEFAULT
}

function mapBrandfetchCountry(name: string | undefined): string | null {
  if (!name) return null
  const key = name.trim().toLowerCase()
  return COUNTRY_MAP[key] ?? null
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

  const apiKey = process.env.BRANDFETCH_API_KEY
  if (!apiKey) return { success: false, error: 'Brandfetch API ist nicht konfiguriert (BRANDFETCH_API_KEY).' }

  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !normalizedDomain.includes('.')) {
    return { success: false, error: 'Ungültige Domain.' }
  }

  let res: Response
  try {
    res = await fetch(`https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(normalizedDomain)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
  } catch (e) {
    return { success: false, error: 'Brandfetch-Anfrage fehlgeschlagen.' }
  }

  if (!res.ok) {
    if (res.status === 404) return { success: false, error: 'Unternehmen für diese Domain nicht gefunden.' }
    if (res.status === 401) return { success: false, error: 'Brandfetch API-Schlüssel ungültig.' }
    if (res.status === 429) return { success: false, error: 'Brandfetch-Limit erreicht. Bitte später erneut versuchen.' }
    return { success: false, error: `Brandfetch-Fehler: ${res.status}` }
  }

  let data: {
    name?: string | null
    domain?: string | null
    description?: string | null
    company?: {
      employees?: number | null
      industries?: { name?: string }[]
      location?: { city?: string; country?: string; region?: string }
    }
    logos?: { formats?: { src?: string }[] }[]
  }
  try {
    data = await res.json()
  } catch {
    return { success: false, error: 'Ungültige Brandfetch-Antwort.' }
  }

  const companyName = (data.name ?? data.domain ?? normalizedDomain).toString().trim() || normalizedDomain
  const websiteUrl = data.domain ? `https://${data.domain.toString().replace(/^https?:\/\//, '')}` : `https://${normalizedDomain}`
  const description = data.description?.toString().trim() || null
  const employeeCount = typeof data.company?.employees === 'number' ? data.company.employees : null
  const firstIndustry = data.company?.industries?.[0]?.name
  const industry = mapBrandfetchIndustry(firstIndustry)
  const loc = data.company?.location
  const headquarters = [loc?.city, loc?.country].filter(Boolean).join(', ') || null
  const country = mapBrandfetchCountry(loc?.country ?? undefined)

  const logoUrl =
    data.logos?.[0]?.formats?.[0]?.src ?? data.logos?.find((l) => l.formats?.length)?.formats?.[0]?.src ?? null

  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', companyName)
    .maybeSingle()

  const payload = {
    name: companyName,
    organization_id: organizationId,
    website_url: websiteUrl || null,
    employee_count: employeeCount,
    headquarters: headquarters || null,
    description: description || null,
    industry: industry || null,
  }

  if (existing?.id) {
    const { error } = await supabase.from('companies').update(payload).eq('id', existing.id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/new')
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
  revalidatePath('/dashboard/new')
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

export type CreateReferenceResult =
  | { success: true; referenceId: string }
  | { success: false; error: string }

const REFERENCE_STATUSES = [
  'draft',
  'pending',
  'external',
  'internal',
  'anonymous',
  'restricted',
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
  const customer_contact = formData.get('customer_contact')?.toString()?.trim() || null
  const projectStatusRaw = formData.get('project_status')?.toString()
  const project_status: 'active' | 'completed' | null =
    projectStatusRaw === 'active' || projectStatusRaw === 'completed'
      ? projectStatusRaw
      : null
  const project_start = formData.get('project_start')?.toString()?.trim() || null
  const project_end = formData.get('project_end')?.toString()?.trim() || null

  if (!title) {
    return { success: false, error: 'Titel ist erforderlich.' }
  }
  if (project_status === 'completed' && !project_end) {
    return { success: false, error: 'Bei abgeschlossenem Projekt ist das Projektende erforderlich.' }
  }

  const status = REFERENCE_STATUSES.includes(statusRaw as (typeof REFERENCE_STATUSES)[number])
    ? (statusRaw as (typeof REFERENCE_STATUSES)[number])
    : 'draft'

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

    // 1) Prüfen, ob es die Firma (für diese Organisation) bereits gibt
    const { data: existingCompany, error: existingError } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('name', nameToUse)
      .maybeSingle()

    if (existingError) {
      return { success: false, error: existingError.message }
    }

    if (existingCompany?.id) {
      // Bereits vorhandene Firma wiederverwenden – keine Duplikate
      resolvedCompanyId = existingCompany.id
    } else {
      // 2) Neue Firma anlegen
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert({
          name: nameToUse,
          industry: industry ?? undefined,
          organization_id: organizationId,
        })
        .select('id')
        .single()

      if (insertError) {
        // Falls es serverseitig bereits einen Unique-Constraint gibt, kann hier ein Konflikt hochkommen
        if ((insertError as { code?: string }).code === '23505') {
          // Bei Unique-Verletzung nochmal versuchen, die bestehende Firma zu laden
          const { data: conflictCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('organization_id', organizationId)
            .ilike('name', nameToUse)
            .maybeSingle()
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

  let filePath: string | null = null
  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('references')
      .upload(fileName, file)
    if (uploadError) {
      return { success: false, error: 'Upload fehlgeschlagen: ' + uploadError.message }
    }
    filePath = uploadData.path
  }

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
      customer_contact,
      contact_id: contactId,
      status,
      file_path: filePath,
      tags,
      project_status,
      project_start: project_start || null,
      project_end: project_end || null,
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

  if (status === 'pending') {
    try {
      await submitForApproval(reference.id)
    } catch (e) {
      console.error('submitForApproval nach Create:', e)
    }
  }

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

  revalidatePath('/dashboard/new')
  revalidatePath('/dashboard/edit/[id]', 'page')

  return { success: true, contact: data }
}
