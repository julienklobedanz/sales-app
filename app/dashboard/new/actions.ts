'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CreateReferenceResult =
  | { success: true; referenceId: string }
  | { success: false; error: string }

const REFERENCE_STATUSES = ['draft', 'pending', 'approved'] as const

export async function createReference(
  formData: FormData
): Promise<CreateReferenceResult> {
  const companyId = formData.get('companyId')?.toString()
  const newCompanyName = formData.get('newCompanyName')?.toString()?.trim()
  const title = formData.get('title')?.toString()?.trim()
  const summary = formData.get('summary')?.toString()?.trim()
  const industry = formData.get('industry')?.toString()?.trim() || null
  const country = formData.get('country')?.toString()?.trim() || null
  const statusRaw = formData.get('status')?.toString()

  if (!title) {
    return { success: false, error: 'Titel ist erforderlich.' }
  }

  const status = REFERENCE_STATUSES.includes(statusRaw as (typeof REFERENCE_STATUSES)[number])
    ? (statusRaw as (typeof REFERENCE_STATUSES)[number])
    : 'draft'

  const supabase = await createServerSupabaseClient()

  let resolvedCompanyId: string

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

    const { data: newCompany, error: insertError } = await supabase
      .from('companies')
      .insert({ name: nameToUse, industry: industry ?? undefined })
      .select('id')
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }
    if (!newCompany?.id) {
      return { success: false, error: 'Firma konnte nicht angelegt werden.' }
    }
    resolvedCompanyId = newCompany.id
  }

  const { data: reference, error: refError } = await supabase
    .from('references')
    .insert({
      company_id: resolvedCompanyId,
      title,
      summary: summary || null,
      industry,
      country,
      status,
    })
    .select('id')
    .single()

  if (refError) {
    return { success: false, error: refError.message }
  }
  if (!reference?.id) {
    return { success: false, error: 'Referenz konnte nicht gespeichert werden.' }
  }

  return { success: true, referenceId: reference.id }
}
