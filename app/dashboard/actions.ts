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
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  contact_id?: string | null
  contact_email?: string | null
  contact_display?: string | null
  customer_contact: string | null
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
  deletedCount: number
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
  onlyFavorites = false,
  view: 'active' | 'trash' = 'active'
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
      website,
      employee_count,
      volume_eur,
      contract_type,
      incumbent_provider,
      competitors,
      customer_challenge,
      our_solution,
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

  let baseQuery = supabase.from('references').select(fullSelect)

  if (view === 'active') {
    baseQuery = baseQuery.is('deleted_at', null)
  } else {
    baseQuery = baseQuery.not('deleted_at', 'is', null)
  }

  const result = await baseQuery.order('created_at', { ascending: false })

  error = result.error
  rows = result.data

  // Fallback: Ohne contact_id und contact_persons (falls Schema noch nicht migriert)
  if (error) {
    console.error('[getDashboardData] Supabase error:', error.message, error.details)
    let fallbackQuery = supabase.from('references').select(`
        id,
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
        companies ( name )
      `)

    if (view === 'active') {
      fallbackQuery = fallbackQuery.is('deleted_at', null)
    } else {
      fallbackQuery = fallbackQuery.not('deleted_at', 'is', null)
    }

    const fallback = await fallbackQuery.order('created_at', { ascending: false })
    if (fallback.error) {
      console.error('[getDashboardData] Fallback error:', fallback.error.message)
      return { references: [], totalCount: 0, deletedCount: 0 }
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
      website: (r.website as string | null) ?? null,
      employee_count: (r.employee_count as number | null) ?? null,
      volume_eur: (r.volume_eur as string | null) ?? null,
      contract_type: (r.contract_type as string | null) ?? null,
      incumbent_provider: (r.incumbent_provider as string | null) ?? null,
      competitors: (r.competitors as string | null) ?? null,
      customer_challenge: (r.customer_challenge as string | null) ?? null,
      our_solution: (r.our_solution as string | null) ?? null,
      status: r.status as ReferenceRow['status'],
      created_at: r.created_at as string,
      updated_at: (r.updated_at as string | null) ?? null,
      company_id: r.company_id as string,
      company_name: company?.name ?? '—',
      contact_id: (r.contact_id as string | null) ?? null,
      contact_email: contact?.email ?? null,
      contact_display: contactDisplay ?? null,
      customer_contact: (r.customer_contact as string | null) ?? null,
      file_path: (r.file_path as string | null) ?? null,
      is_favorited: favoriteIds.has(r.id as string),
      tags: (r.tags as string | null) ?? null,
      project_status: (r.project_status as 'active' | 'completed' | null) ?? null,
      project_start: (r.project_start as string | null) ?? null,
      project_end: (r.project_end as string | null) ?? null,
      duration_months,
    }
  })

  if (view === 'active' && onlyFavorites) {
    references = references.filter((r) => r.is_favorited)
  }

  const { count: deletedCount } = await supabase
    .from('references')
    .select('id', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)

  return {
    references,
    totalCount: references.length,
    deletedCount: deletedCount ?? 0,
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

export type BulkImportReferencesResult =
  | { success: true; created: number }
  | { success: false; error: string }

export type BulkImportGroup = { projectName: string; fileCount: number }

const BULK_IMPORT_MAX_FILES = 20
const BULK_IMPORT_COMPANY_NAME = 'Import (Entwürfe)'

export async function bulkCreateReferencesFromFiles(
  formData: FormData
): Promise<BulkImportReferencesResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Nur Admins können Referenzen im Bulk importieren.' }
  }

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const groupsJson = formData.get('groups') as string | null
  const groups: BulkImportGroup[] = groupsJson ? (JSON.parse(groupsJson) as BulkImportGroup[]) : []
  const files = formData.getAll('files') as File[]

  const totalFiles = files?.length ?? 0
  if (totalFiles === 0) return { success: false, error: 'Keine Dateien übergeben.' }
  if (totalFiles > BULK_IMPORT_MAX_FILES) {
    return { success: false, error: `Maximal ${BULK_IMPORT_MAX_FILES} Dateien erlaubt.` }
  }

  // Ohne Gruppen: eine Referenz pro Datei (Legacy), mit Gruppen: eine Referenz pro Gruppe + Assets
  const useGroups = Array.isArray(groups) && groups.length > 0
  const expectedCount = useGroups ? groups.reduce((s, g) => s + g.fileCount, 0) : totalFiles
  if (useGroups && expectedCount !== totalFiles) {
    return { success: false, error: 'Anzahl der Dateien stimmt nicht mit den Gruppen überein.' }
  }

  let companyId: string
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', BULK_IMPORT_COMPANY_NAME)
    .maybeSingle()

  if (existingCompany?.id) {
    companyId = existingCompany.id
  } else {
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: BULK_IMPORT_COMPANY_NAME,
        organization_id: organizationId,
      })
      .select('id')
      .single()
    if (companyError || !newCompany?.id) {
      return { success: false, error: companyError?.message ?? 'Unternehmen für Import konnte nicht angelegt werden.' }
    }
    companyId = newCompany.id
  }

  let created = 0
  let fileIndex = 0

  if (useGroups) {
    for (const group of groups) {
      const groupFiles = files.slice(fileIndex, fileIndex + group.fileCount)
      fileIndex += group.fileCount
      const title = (group.projectName?.trim() || groupFiles[0]?.name?.replace(/\.[^.]+$/, '').trim()) || 'Referenz'
      const { data: refRow, error: insertRefError } = await supabase
        .from('references')
        .insert({
          company_id: companyId,
          title,
          summary: null,
          industry: null,
          country: null,
          status: 'draft',
          contact_id: null,
          file_path: null,
          tags: null,
          project_status: null,
          project_start: null,
          project_end: null,
          website: null,
          employee_count: null,
          volume_eur: null,
          contract_type: null,
          customer_contact: null,
        })
        .select('id')
        .single()
      if (insertRefError || !refRow?.id) continue
      const referenceId = refRow.id
      for (const file of groupFiles) {
        if (!(file instanceof File) || !file.name?.trim()) continue
        let filePath: string | null = null
        if (file.size > 0) {
          const safeName = `${Date.now()}-${referenceId.slice(0, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('references')
            .upload(safeName, file)
          if (!uploadError && uploadData?.path) filePath = uploadData.path
        }
        if (filePath) {
          const ext = file.name.includes('.') ? file.name.split('.').pop() ?? '' : ''
          await supabase.from('reference_assets').insert({
            reference_id: referenceId,
            file_path: filePath,
            file_name: file.name,
            file_type: ext || null,
            category: 'other',
          })
        }
      }
      created++
    }
  } else {
    for (const file of files) {
      if (!(file instanceof File) || !file.name?.trim()) continue
      let filePath: string | null = null
      if (file.size > 0) {
        const fileName = `${Date.now()}-${created}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('references')
          .upload(fileName, file)
        if (!uploadError && uploadData?.path) filePath = uploadData.path
      }
      const title = file.name.replace(/\.[^.]+$/, '').trim() || file.name
      const { data: refRow, error: insertRefError } = await supabase.from('references').insert({
        company_id: companyId,
        title,
        summary: null,
        industry: null,
        country: null,
        status: 'draft',
        contact_id: null,
        file_path: filePath,
        tags: null,
        project_status: null,
        project_start: null,
        project_end: null,
        website: null,
        employee_count: null,
        volume_eur: null,
        contract_type: null,
        customer_contact: null,
      }).select('id').single()
      if (!insertRefError && refRow?.id && filePath) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() ?? '' : ''
        await supabase.from('reference_assets').insert({
          reference_id: refRow.id,
          filePath,
          file_name: file.name,
          file_type: ext || null,
          category: 'other',
        })
      }
      if (!insertRefError) created++
    }
  }

  revalidatePath('/dashboard')
  return { success: true, created }
}

export async function deleteReference(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('references')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
}

export async function restoreReference(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('references')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
}

export async function hardDeleteReference(id: string) {
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
  const customer_contact =
    formData.get('customer_contact')?.toString()?.trim() ?? null
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
  } = {
    title,
    summary,
    industry,
    country,
    contact_id: contactId,
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

export type ReferenceAssetRow = {
  id: string
  reference_id: string
  file_path: string
  file_name: string | null
  file_type: string | null
  category: 'sales' | 'contract' | 'other'
  created_at: string
}

export async function getReferenceAssets(
  referenceId: string
): Promise<ReferenceAssetRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('reference_assets')
    .select('id, reference_id, file_path, file_name, file_type, category, created_at')
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.id,
    reference_id: r.reference_id,
    file_path: r.file_path,
    file_name: r.file_name ?? null,
    file_type: r.file_type ?? null,
    category: (r.category as 'sales' | 'contract' | 'other') || 'other',
    created_at: r.created_at,
  }))
}

export async function updateReferenceAssetCategory(
  assetId: string,
  category: 'sales' | 'contract' | 'other'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('reference_assets')
    .update({ category })
    .eq('id', assetId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export type SubmitTicketResult = { success: true } | { success: false; error: string }

export async function submitTicket(
  type: 'support' | 'feedback',
  subject: string,
  message: string
): Promise<SubmitTicketResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const subj = subject?.toString()?.trim()
  const msg = message?.toString()?.trim()
  if (!subj) return { success: false, error: 'Bitte einen Betreff angeben.' }
  if (!msg) return { success: false, error: 'Bitte eine Nachricht eingeben.' }

  const { error } = await supabase.from('tickets').insert({
    user_id: user.id,
    type,
    subject: subj,
    message: msg,
    status: 'open',
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
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
