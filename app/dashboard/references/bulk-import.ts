'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type BulkImportReferencesResult =
  | { success: true; created: number }
  | { success: false; error: string }

type BulkImportGroup = { projectName: string; fileCount: number }

const BULK_IMPORT_MAX_FILES = 20
const BULK_IMPORT_COMPANY_NAME = 'Import (Entwürfe)'

export async function bulkCreateReferencesFromFilesImpl(
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
      return {
        success: false,
        error: companyError?.message ?? 'Unternehmen für Import konnte nicht angelegt werden.',
      }
    }
    companyId = newCompany.id
  }

  let created = 0
  let fileIndex = 0

  if (useGroups) {
    for (const group of groups) {
      const groupFiles = files.slice(fileIndex, fileIndex + group.fileCount)
      fileIndex += group.fileCount
      const title =
        (group.projectName?.trim() || groupFiles[0]?.name?.replace(/\.[^.]+$/, '').trim()) ||
        'Referenz'
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
        })
        .select('id')
        .single()
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

