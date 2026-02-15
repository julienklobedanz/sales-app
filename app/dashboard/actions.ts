'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type ReferenceRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status:
    | 'draft'
    | 'pending'
    | 'external'
    | 'internal'
    | 'anonymous'
    | 'restricted'
  created_at: string
  company_id: string
  company_name: string
  website?: string | null
  contact_id?: string | null
  contact_email?: string | null
  contact_display?: string | null
  file_path?: string | null
}

export type GetDashboardDataResult = {
  references: ReferenceRow[]
  totalCount: number
}

export async function getDashboardData(): Promise<GetDashboardDataResult> {
  const supabase = await createServerSupabaseClient()

  // Relation per FK-Constraint-Name (Supabase: Table Editor → references → Beziehungen).
  // Falls Fehler bleibt: exakten Constraint-Namen aus Fehlermeldung details übernehmen.
  const fullSelect = `
      id,
      title,
      summary,
      industry,
      country,
      status,
      created_at,
      company_id,
      contact_id,
      file_path,
      companies ( name ),
      contact_persons!references_contact_id_fkey ( email, first_name, last_name )
    `
  let rows: Record<string, unknown>[] | null = null
  let error: { message: string; details?: string } | null = null

  const result = await supabase
    .from('references')
    .select(fullSelect)
    .order('created_at', { ascending: false })

  error = result.error
  rows = result.data

  // Fallback: Ohne contact_id und contact_persons (falls Schema noch nicht migriert)
  if (error) {
    console.error('[getDashboardData] Supabase error:', error.message, error.details)
    const fallback = await supabase
      .from('references')
      .select(`
        id,
        title,
        summary,
        industry,
        country,
        status,
        created_at,
        company_id,
        file_path,
        companies ( name )
      `)
      .order('created_at', { ascending: false })
    if (fallback.error) {
      console.error('[getDashboardData] Fallback error:', fallback.error.message)
      return { references: [], totalCount: 0 }
    }
    rows = fallback.data
  }

  const references: ReferenceRow[] = (rows ?? []).map((r: Record<string, unknown>) => {
    const raw = r.companies
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string })
        : (raw as { name?: string } | null)
    const contactRaw = r.contact_persons
    const contact = contactRaw
      ? Array.isArray(contactRaw) && contactRaw.length > 0
        ? (contactRaw[0] as { email?: string; first_name?: string; last_name?: string })
        : (contactRaw as { email?: string; first_name?: string; last_name?: string })
      : null
    const contactDisplay = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || null
      : null
    return {
      id: r.id as string,
      title: r.title as string,
      summary: (r.summary as string | null) ?? null,
      industry: (r.industry as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      status: r.status as ReferenceRow['status'],
      created_at: r.created_at as string,
      company_id: r.company_id as string,
      company_name: company?.name ?? '—',
      contact_id: (r.contact_id as string | null) ?? null,
      contact_email: contact?.email ?? null,
      contact_display: contactDisplay ?? null,
      file_path: (r.file_path as string | null) ?? null,
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
  const contactIdRaw = formData.get('contactId')?.toString()?.trim() ?? null
  const contactId =
    contactIdRaw && contactIdRaw !== '__none__' ? contactIdRaw : null
  const statusRaw = formData.get('status')?.toString()
  const allowed: ReferenceRow['status'][] = [
    'draft',
    'pending',
    'external',
    'internal',
    'anonymous',
    'restricted',
  ]
  const status = allowed.includes(statusRaw as ReferenceRow['status'])
    ? (statusRaw as ReferenceRow['status'])
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
    contact_id: string | null
    status: string
    updated_at: string
    file_path?: string
  } = {
    title,
    summary,
    industry,
    country,
    contact_id: contactId,
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

  if (status === 'pending') {
    await submitForApproval(id)
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/edit/${id}`)
}

export async function submitForApproval(id: string) {
  const supabase = await createServerSupabaseClient()

  const newToken = crypto.randomUUID()

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(`
      title,
      contact_id,
      companies ( name ),
      contact_persons!references_contact_id_fkey ( email, first_name )
    `)
    .eq('id', id)
    .single()

  if (fetchError || !row) throw new Error('Referenz nicht gefunden')

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? (row.companies[0] as { name?: string })
      : (row.companies as { name?: string } | null)
  const company_name = company?.name ?? 'Referenz'

  const { error: updateError } = await supabase
    .from('references')
    .update({
      status: 'pending',
      approval_token: newToken,
    })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)

  const contactPerson = Array.isArray(row.contact_persons)
    ? row.contact_persons[0]
    : row.contact_persons
  const contact = contactPerson as { email?: string; first_name?: string } | null
  const contactEmail =
    typeof contact?.email === 'string' && contact.email.includes('@')
      ? contact.email
      : null

  if (contactEmail && process.env.RESEND_API_KEY) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const firstName = contact?.first_name ?? ''
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: contactEmail,
        subject: `Freigabe erforderlich: ${company_name}`,
        html: `
          <h1>Hallo${firstName ? ` ${firstName}` : ''}!</h1>
          <p>Für das Unternehmen <strong>${company_name}</strong> wurde eine neue Referenz erstellt:</p>
          <p><em>"${row.title}"</em></p>
          <p>Bitte klicken Sie auf den folgenden Link, um die Details zu prüfen und die Freigabestufe festzulegen:</p>
          <a href="${baseUrl}/approval/${newToken}" 
             style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Jetzt prüfen & freigeben
          </a>
        `,
      })
    } catch (e) {
      console.error('E-Mail-Versand fehlgeschlagen:', e)
    }
  }

  revalidatePath('/dashboard')
}

export async function updateUserRole(role: 'admin' | 'sales') {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
