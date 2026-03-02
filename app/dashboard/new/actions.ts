'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { submitForApproval } from '../actions'

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
