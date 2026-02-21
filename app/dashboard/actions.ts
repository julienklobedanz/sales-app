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
  updated_at: string | null
  company_id: string
  company_name: string
  website?: string | null
  contact_id?: string | null
  contact_email?: string | null
  contact_display?: string | null
  file_path?: string | null
  is_favorited: boolean
  tags: string | null
  project_status: 'active' | 'completed' | null
  project_start: string | null
  project_end: string | null
  duration_months: number | null
}

export type GetDashboardDataResult = {
  references: ReferenceRow[]
  totalCount: number
}

export type RequestItem = {
  id: string
  reference_id: string
  reference_title: string
  company_name: string
  requester_name?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export async function getDashboardData(
  onlyFavorites = false
): Promise<GetDashboardDataResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Relation per FK-Constraint-Name (Supabase: Table Editor → references → Beziehungen).
  const fullSelect = `
      id,
      title,
      summary,
      industry,
      country,
      status,
      created_at,
      updated_at,
      company_id,
      contact_id,
      file_path,
      tags,
      project_status,
      project_start,
      project_end,
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
        updated_at,
        company_id,
        file_path,
        tags,
        project_status,
        project_start,
        project_end,
        companies ( name )
      `)
      .order('created_at', { ascending: false })
    if (fallback.error) {
      console.error('[getDashboardData] Fallback error:', fallback.error.message)
      return { references: [], totalCount: 0 }
    }
    rows = fallback.data
  }

  // Favoriten des aktuellen Users (Set für schnellen Lookup)
  const favoriteIds = new Set<string>()
  if (user) {
    const { data: favs } = await supabase
      .from('favorites')
      .select('reference_id')
      .eq('user_id', user.id)
    if (favs) {
      favs.forEach((f: { reference_id: string }) => favoriteIds.add(f.reference_id))
    }
  }

  let references: ReferenceRow[] = (rows ?? []).map((r: Record<string, unknown>) => {
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
    const start = r.project_start as string | null
    const end = r.project_end as string | null
    let duration_months: number | null = null
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        duration_months = Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()))
      }
    }
    return {
      id: r.id as string,
      title: r.title as string,
      summary: (r.summary as string | null) ?? null,
      industry: (r.industry as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      status: r.status as ReferenceRow['status'],
      created_at: r.created_at as string,
      updated_at: (r.updated_at as string | null) ?? null,
      company_id: r.company_id as string,
      company_name: company?.name ?? '—',
      contact_id: (r.contact_id as string | null) ?? null,
      contact_email: contact?.email ?? null,
      contact_display: contactDisplay ?? null,
      file_path: (r.file_path as string | null) ?? null,
      is_favorited: favoriteIds.has(r.id as string),
      tags: (r.tags as string | null) ?? null,
      project_status: (r.project_status as 'active' | 'completed' | null) ?? null,
      project_start: (r.project_start as string | null) ?? null,
      project_end: (r.project_end as string | null) ?? null,
      duration_months,
    }
  })

  if (onlyFavorites) {
    references = references.filter((r) => r.is_favorited)
  }

  return {
    references,
    totalCount: references.length,
  }
}

export async function toggleFavorite(referenceId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht eingeloggt')

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('reference_id', referenceId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
  } else {
    await supabase.from('favorites').insert({
      user_id: user.id,
      reference_id: referenceId,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/favorites')
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
  const tags = formData.get('tags')?.toString()?.trim() ?? null
  const projectStatusRaw = formData.get('project_status')?.toString()
  const project_status: 'active' | 'completed' | null =
    projectStatusRaw === 'active' || projectStatusRaw === 'completed'
      ? projectStatusRaw
      : null
  const project_start = formData.get('project_start')?.toString()?.trim() || null
  const project_end = formData.get('project_end')?.toString()?.trim() || null

  if (!title) {
    throw new Error('Titel ist erforderlich.')
  }
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
    tags: string | null
    project_status: 'active' | 'completed' | null
    project_start: string | null
    project_end: string | null
  } = {
    title,
    summary,
    industry,
    country,
    contact_id: contactId,
    status,
    updated_at: new Date().toISOString(),
    tags,
    project_status,
    project_start,
    project_end,
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

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

  const { data: existing } = await supabase
    .from('approvals')
    .select('id')
    .eq('reference_id', id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!existing) {
    await supabase.from('approvals').insert({
      reference_id: id,
      requester_id: user.id,
      status: 'pending',
    })
  }

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
  revalidatePath('/dashboard/requests')
}

export async function getRequests(): Promise<RequestItem[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('approvals')
    .select(
      `
      id,
      status,
      created_at,
      reference:references (
        id,
        title,
        companies ( name )
      ),
      requester:profiles ( full_name )
    `
    )
    .order('created_at', { ascending: false })

  if (profile?.role !== 'admin') {
    query = query.eq('requester_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getRequests] Error:', error)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const reference = row.reference as
      | { id?: string; title?: string; companies?: { name?: string } | { name?: string }[] }
      | null
    const companies = reference?.companies
    const companyName =
      Array.isArray(companies) && companies.length > 0
        ? (companies[0] as { name?: string }).name
        : (companies as { name?: string } | null)?.name

    const requester = row.requester as { full_name?: string } | null

    return {
      id: row.id as string,
      reference_id: reference?.id as string,
      reference_title: reference?.title ?? 'Unbekannt',
      company_name: companyName ?? '—',
      requester_name: requester?.full_name ?? 'Unbekannt',
      status: row.status as RequestItem['status'],
      created_at: row.created_at as string,
    }
  })
}

export async function reviewRequest(
  approvalId: string,
  decision: 'approve_external' | 'approve_internal' | 'reject'
) {
  const supabase = await createServerSupabaseClient()

  const { data: approval, error: fetchErr } = await supabase
    .from('approvals')
    .select('reference_id')
    .eq('id', approvalId)
    .single()

  if (fetchErr || !approval) throw new Error('Antrag nicht gefunden')

  let newRefStatus = 'draft'
  let approvalStatus: 'approved' | 'rejected' = 'rejected'

  if (decision === 'approve_external') {
    newRefStatus = 'external'
    approvalStatus = 'approved'
  } else if (decision === 'approve_internal') {
    newRefStatus = 'internal'
    approvalStatus = 'approved'
  }

  const { error: refError } = await supabase
    .from('references')
    .update({ status: newRefStatus })
    .eq('id', approval.reference_id)

  if (refError) throw new Error(refError.message)

  const { error: appError } = await supabase
    .from('approvals')
    .update({ status: approvalStatus })
    .eq('id', approvalId)

  if (appError) throw new Error(appError.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/requests')
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
