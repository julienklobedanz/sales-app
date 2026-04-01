'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

import type { ReferenceRow } from '@/app/dashboard/actions'

export async function updateReferenceImpl(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const companyName = formData.get('company_name')?.toString()?.trim()
  const title = formData.get('title')?.toString()?.trim()
  const summary = formData.get('summary')?.toString()?.trim() ?? null
  const industry = formData.get('industry')?.toString()?.trim() ?? null
  const country = formData.get('country')?.toString()?.trim() ?? null
  const contactIdRaw = formData.get('contactId')?.toString()?.trim() ?? null
  const contactId = contactIdRaw && contactIdRaw !== '__none__' ? contactIdRaw : null
  const statusRaw = formData.get('status')?.toString()
  const submitMode = formData.get('submitMode')?.toString()
  const allowed: ReferenceRow['status'][] = ['draft', 'internal_only', 'approved', 'anonymized']
  const status =
    submitMode === 'draft'
      ? 'draft'
      : allowed.includes(statusRaw as ReferenceRow['status'])
        ? (statusRaw as ReferenceRow['status'])
        : 'draft'
  const tags = formData.get('tags')?.toString()?.trim() ?? null
  const website = formData.get('website')?.toString()?.trim() ?? null
  const employeeCountRaw = formData.get('employee_count')?.toString()?.trim() ?? null
  const employee_count =
    employeeCountRaw && !Number.isNaN(Number(employeeCountRaw))
      ? Math.max(0, Math.trunc(Number(employeeCountRaw)))
      : null
  const volume_eur = formData.get('volume_eur')?.toString()?.trim() ?? null
  const contract_type = formData.get('contract_type')?.toString()?.trim() ?? null
  const incumbent_provider = formData.get('incumbent_provider')?.toString()?.trim() ?? null
  const competitors = formData.get('competitors')?.toString()?.trim() ?? null
  const customer_challenge = formData.get('customer_challenge')?.toString()?.trim() ?? null
  const our_solution = formData.get('our_solution')?.toString()?.trim() ?? null
  const customer_contact = formData.get('customer_contact')?.toString()?.trim() ?? null
  const customer_contact_id_raw = formData.get('customer_contact_id')?.toString()?.trim() ?? null
  const customer_contact_id =
    customer_contact_id_raw && customer_contact_id_raw !== '__none__' ? customer_contact_id_raw : null
  const projectStatusRaw = formData.get('project_status')?.toString()
  const project_status: 'active' | 'completed' | null =
    projectStatusRaw === 'active' || projectStatusRaw === 'completed' ? projectStatusRaw : null
  const project_start = formData.get('project_start')?.toString()?.trim() || null
  const project_end = formData.get('project_end')?.toString()?.trim() || null
  const ndaDealRaw = formData.get('nda_deal')?.toString()
  const is_nda_deal = ndaDealRaw === '1' || ndaDealRaw === 'true'

  if (!title) {
    throw new Error('Titel ist erforderlich.')
  }
  // Kontakt/Projekt sind in der DB optional; nicht blockieren (analog createReference).
  if (project_status === 'completed' && !project_end) {
    throw new Error('Bei abgeschlossenem Projekt ist das Projektende erforderlich.')
  }

  const { data: ref, error: fetchError } = await supabase
    .from('references')
    .select('company_id')
    .eq('id', id)
    .single()

  if (fetchError || !ref) {
    throw new Error('Referenz nicht gefunden.')
  }

  if (companyName) {
    const { error: companyError } = await supabase
      .from('companies')
      .update({ name: companyName, updated_at: new Date().toISOString() })
      .eq('id', ref.company_id)
    if (companyError) {
      throw new Error(companyError.message)
    }
  }

  const maybeFile = formData.get('file')
  let filePath: string | undefined
  if (maybeFile && maybeFile instanceof File && maybeFile.size > 0) {
    try {
      const safeName = maybeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${Date.now()}-${id.slice(0, 8)}-${safeName}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('references')
        .upload(fileName, maybeFile)
      if (!uploadError && uploadData?.path) {
        filePath = uploadData.path
      } else if (uploadError) {
        console.error('[updateReference] Upload fehlgeschlagen:', uploadError.message)
      }
    } catch (e) {
      console.error('[updateReference] Unerwarteter Fehler beim Upload:', e)
    }
  }

  const updatePayload: {
    title: string
    summary: string | null
    industry: string | null
    country: string | null
    contact_id: string | null
    customer_contact_id: string | null
    status: string
    updated_at: string
    file_path?: string
    tags: string | null
    website: string | null
    employee_count: number | null
    volume_eur: string | null
    contract_type: string | null
    incumbent_provider: string | null
    competitors: string | null
    customer_challenge: string | null
    our_solution: string | null
    customer_contact: string | null
    project_status: 'active' | 'completed' | null
    project_start: string | null
    project_end: string | null
    is_nda_deal: boolean
  } = {
    title,
    summary,
    industry,
    country,
    contact_id: contactId,
    customer_contact_id,
    status,
    updated_at: new Date().toISOString(),
    tags,
    website,
    employee_count,
    volume_eur,
    contract_type,
    incumbent_provider,
    competitors,
    customer_challenge,
    our_solution,
    customer_contact,
    project_status,
    project_start,
    project_end,
    is_nda_deal,
  }
  if (filePath !== undefined) {
    updatePayload.file_path = filePath
  }

  const { error } = await supabase.from('references').update(updatePayload).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  // Bei Freigabe-Workflows bleibt die Statuslogik im 4-Status-Modell,
  // daher ist kein automatischer Wechsel auf einen Legacy-Status mehr nötig.

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/evidence/${id}/edit`)
}

