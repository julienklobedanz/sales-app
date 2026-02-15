'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ReferenceRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: 'draft' | 'pending' | 'approved'
  created_at: string
  company_id: string
  company_name: string
  website?: string | null
  contact_person?: string | null
  file_path?: string | null
}

export type GetDashboardDataResult = {
  references: ReferenceRow[]
  totalCount: number
}

export async function getDashboardData(): Promise<GetDashboardDataResult> {
  const supabase = await createServerSupabaseClient()

  const { data: rows, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      industry,
      country,
      status,
      created_at,
      company_id,
      file_path,
      companies (
        name
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    return { references: [], totalCount: 0 }
  }

  const references: ReferenceRow[] = (rows ?? []).map((r) => {
    const raw = r.companies
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string })
        : (raw as { name?: string } | null)
    return {
      id: r.id,
      title: r.title,
      summary: r.summary ?? null,
      industry: r.industry ?? null,
      country: r.country ?? null,
      status: r.status as ReferenceRow['status'],
      created_at: r.created_at,
      company_id: r.company_id,
      company_name: company?.name ?? '—',
      file_path: r.file_path ?? null,
    }
  })

  return {
    references,
    totalCount: references.length,
  }
}

export async function deleteReference(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('references')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
}

export async function updateReference(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const companyName = formData.get('company_name')?.toString()?.trim()
  const title = formData.get('title')?.toString()?.trim()
  const summary = formData.get('summary')?.toString()?.trim() ?? null
  const industry = formData.get('industry')?.toString()?.trim() ?? null
  const country = formData.get('country')?.toString()?.trim() ?? null
  const statusRaw = formData.get('status')?.toString()
  const status =
    statusRaw === 'draft' || statusRaw === 'pending' || statusRaw === 'approved'
      ? statusRaw
      : 'draft'

  if (!title) {
    throw new Error('Titel ist erforderlich.')
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

  const file = formData.get('file') as File | null
  let filePath: string | undefined
  if (file && file.size > 0) {
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('references')
      .upload(fileName, file)
    if (uploadError) {
      throw new Error('Upload fehlgeschlagen: ' + uploadError.message)
    }
    filePath = uploadData.path
  }

  const updatePayload: {
    title: string
    summary: string | null
    industry: string | null
    country: string | null
    status: string
    updated_at: string
    file_path?: string
  } = {
    title,
    summary,
    industry,
    country,
    status,
    updated_at: new Date().toISOString(),
  }
  if (filePath !== undefined) {
    updatePayload.file_path = filePath
  }

  const { error } = await supabase
    .from('references')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/edit/${id}`)
}
