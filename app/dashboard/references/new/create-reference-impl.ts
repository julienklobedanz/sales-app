import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import {
  revalidateOrgCachesForReference,
  revalidateOrgReferences,
} from '@/lib/cache/revalidate-org'
import { narrativeFieldLengthError } from '@/lib/references/reference-narrative-limits'
import { ensureBrandfetchDarkLogoUrl } from '@/lib/brandfetch/logo-theme-url'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import { normalizeContractType } from '@/lib/references/contract-type'
import { extractDataFromDocument } from '@/lib/document-text'
import { parseGermanEmployeeCountInput } from '@/lib/format'
import type { ExtractDataFromDocumentResult } from './types'
import type { CreateReferenceResult } from './reference-new-action-types'
import {
  domainToDisplayName,
  looksLikeDomain,
  normalizeDomain,
} from './company-search-enrich-impl'

const REFERENCE_STATUSES = ['draft', 'internal_only', 'approved', 'anonymized'] as const

/** Server Action: KI-Import aus PDF/DOCX/PPTX (für das Referenz-Formular im Client). */
export async function extractReferenceDocumentFromUploadImpl(
  formData: FormData,
): Promise<ExtractDataFromDocumentResult> {
  return extractDataFromDocument(formData)
}

export async function createReferenceImpl(
  formData: FormData,
): Promise<CreateReferenceResult> {
  const companyId = formData.get('companyId')?.toString()
  const newCompanyName = formData.get('newCompanyName')?.toString()?.trim()
  const title = formData.get('title')?.toString()?.trim()
  const summary = normalizeNarrativeText(formData.get('summary')?.toString())
  const industry = formData.get('industry')?.toString()?.trim() || null
  const country = formData.get('country')?.toString()?.trim() || null
  const contactIdRaw = formData.get('contactId')?.toString()?.trim() || null
  const contactId = contactIdRaw && contactIdRaw !== '__none__' ? contactIdRaw : null
  const statusRaw = formData.get('status')?.toString()
  const tags = formData.get('tags')?.toString()?.trim() || null
  const website = formData.get('website')?.toString()?.trim() || null
  const employeeCountRaw = formData.get('employee_count')?.toString()?.trim() || null
  const employee_count = parseGermanEmployeeCountInput(employeeCountRaw)
  const companyHeadquarters =
    formData.get('company_headquarters')?.toString()?.trim() || null
  const companyLogoUrlRaw = formData.get('company_logo_url')?.toString()?.trim() || null
  const company_logo_url = companyLogoUrlRaw
    ? (ensureBrandfetchDarkLogoUrl(companyLogoUrlRaw) ?? companyLogoUrlRaw)
    : null
  const volume_eur = formData.get('volume_eur')?.toString()?.trim() || null
  const contract_type = normalizeContractType(formData.get('contract_type')?.toString())
  const incumbent_provider =
    formData.get('incumbent_provider')?.toString()?.trim() || null
  const competitors = formData.get('competitors')?.toString()?.trim() || null
  const customer_challenge = normalizeNarrativeText(
    formData.get('customer_challenge')?.toString(),
  )
  const our_solution = normalizeNarrativeText(formData.get('our_solution')?.toString())
  const customer_contact = formData.get('customer_contact')?.toString()?.trim() || null
  const customer_contact_id_raw =
    formData.get('customer_contact_id')?.toString()?.trim() || null
  const customer_contact_id =
    customer_contact_id_raw && customer_contact_id_raw !== '__none__'
      ? customer_contact_id_raw
      : null
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

  const summaryLenErr = narrativeFieldLengthError(
    formData.get('summary')?.toString(),
    'Zusammenfassung',
  )
  if (summaryLenErr) return { success: false, error: summaryLenErr }
  const challengeLenErr = narrativeFieldLengthError(
    formData.get('customer_challenge')?.toString(),
    'Herausforderung',
  )
  if (challengeLenErr) return { success: false, error: challengeLenErr }
  const solutionLenErr = narrativeFieldLengthError(
    formData.get('our_solution')?.toString(),
    'Lösung',
  )
  if (solutionLenErr) return { success: false, error: solutionLenErr }

  // NOTE: Diese Felder sind in der DB optional. UI kann sie später nachpflegen,
  // daher blockieren wir das Speichern hier nicht.
  if (project_status === 'completed' && !project_end) {
    return {
      success: false,
      error: 'Bei abgeschlossenem Projekt ist das Projektende erforderlich.',
    }
  }

  const submitMode = formData.get('submitMode')?.toString()
  const rawStatus = REFERENCE_STATUSES.includes(
    statusRaw as (typeof REFERENCE_STATUSES)[number],
  )
    ? (statusRaw as (typeof REFERENCE_STATUSES)[number])
    : 'draft'
  const status = submitMode === 'draft' ? 'draft' : rawStatus

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
    return {
      success: false,
      error:
        'Dein Profil ist keiner Organisation zugeordnet. Bitte Einstellungen prüfen.',
    }
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
      return {
        success: false,
        error: 'Bitte Firmennamen eingeben oder ein Unternehmen wählen.',
      }
    }
    const normalizedDomainForMatch = normalizeDomain(nameToUse)
    const displayName = looksLikeDomain(nameToUse)
      ? domainToDisplayName(nameToUse)
      : nameToUse

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
          const { data: c1 } = await supabase
            .from('companies')
            .select('id')
            .eq('organization_id', organizationId)
            .ilike('name', displayName)
            .maybeSingle()
          const conflictCompany =
            c1 ??
            (
              await supabase
                .from('companies')
                .select('id')
                .eq('organization_id', organizationId)
                .ilike('name', nameToUse)
                .maybeSingle()
            ).data
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

export async function attachOriginalDocumentToReferenceImpl(params: {
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
