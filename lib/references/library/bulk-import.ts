'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgReferences } from '@/lib/cache/revalidate-org'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import { resolveOrCreateCompanyForImport } from '@/lib/accounts/resolve-company-for-import'
import { extractPlainTextFromBuffer } from '@/lib/document-text'
import { parseReferenceHeuristicsFromText } from '@/lib/references/heuristic-reference-extract'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import { mapBrandfetchIndustriesArrayToGermanCategory } from '@/lib/brandfetch/map-brandfetch-industry-to-de'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'

type BulkImportReferencesResult =
  | { success: true; created: number; referenceIds: string[]; organizationId: string }
  | { success: false; error: string }

type BulkImportGroup = {
  projectName: string
  fileCount: number
  companyName?: string
}

async function extractMetadataFromFile(file: File) {
  if (!(file instanceof File) || file.size === 0) return null
  const buffer = Buffer.from(await file.arrayBuffer())
  const plain = await extractPlainTextFromBuffer(buffer, file.name, file.type)
  if (!plain.ok) return null
  return parseReferenceHeuristicsFromText(plain.text, { fileName: file.name })
}

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
    .select('system_role, function_role, organization_id')
    .eq('id', user.id)
    .single()

  const { systemRole } = parseProfileRoles(profile)
  if (!isSystemAdmin(systemRole)) {
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

  const useGroups = Array.isArray(groups) && groups.length > 0
  const expectedCount = useGroups ? groups.reduce((s, g) => s + g.fileCount, 0) : totalFiles
  if (useGroups && expectedCount !== totalFiles) {
    return { success: false, error: 'Anzahl der Dateien stimmt nicht mit den Gruppen überein.' }
  }

  let created = 0
  let fileIndex = 0
  const referenceIds: string[] = []

  const processGroup = async (groupFiles: File[], groupMeta?: BulkImportGroup) => {
    const primaryFile = groupFiles[0]
    const parsed = primaryFile ? await extractMetadataFromFile(primaryFile) : null

    const manualTitle = groupMeta?.projectName?.trim()
    const parsedTitle = parsed?.title?.trim()
    const manualLooksLikeBoilerplate =
      manualTitle &&
      manualTitle.length > 100 &&
      /^Die\s+.+\s+ist\s+/i.test(manualTitle)

    const title =
      (manualTitle && !manualLooksLikeBoilerplate ? manualTitle : null) ||
      parsedTitle ||
      primaryFile?.name.replace(/\.[^.]+$/, '').trim() ||
      'Referenz'

    const companyHint =
      groupMeta?.companyName?.trim() || parsed?.company_name?.trim() || null

    let companyResolved
    if (companyHint) {
      companyResolved = await resolveOrCreateCompanyForImport(supabase, organizationId, companyHint)
    } else {
      companyResolved = await resolveOrCreateCompanyForImport(
        supabase,
        organizationId,
        'Unbekannter Kunde'
      )
    }
    if (!companyResolved.success) return

    const co = companyResolved.company
    const industryMapped =
      co.industry ??
      (parsed?.industry
        ? mapBrandfetchIndustriesArrayToGermanCategory([{ name: parsed.industry }]) ?? parsed.industry
        : null)

    const { data: refRow, error: insertRefError } = await supabase
      .from('references')
      .insert({
        company_id: co.companyId,
        title,
        summary: parsed?.summary ? normalizeNarrativeText(parsed.summary) : null,
        industry: industryMapped,
        country: co.headquarters,
        status: 'draft',
        contact_id: null,
        file_path: null,
        tags: parsed?.tags?.length ? parsed.tags.join(', ') : null,
        website: co.website_url,
        employee_count: co.employee_count ?? parsed?.employee_count ?? null,
        volume_eur: parsed?.volume_eur?.trim() || null,
        contract_type: parsed?.contract_type?.trim() || null,
        incumbent_provider: parsed?.incumbent_provider?.trim() || null,
        competitors: parsed?.competitors?.trim() || null,
        customer_contact: null,
        customer_challenge: parsed?.customer_challenge
          ? normalizeNarrativeText(parsed.customer_challenge)
          : null,
        our_solution: parsed?.our_solution ? normalizeNarrativeText(parsed.our_solution) : null,
        project_status:
          parsed?.project_start || parsed?.project_end || parsed?.duration_months
            ? 'completed'
            : null,
        project_start: (() => {
          let start = parsed?.project_start?.trim() || null
          const end = parsed?.project_end?.trim() || null
          const months = parsed?.duration_months
          if (months && end && !start) {
            const dte = new Date(`${end}T12:00:00Z`)
            dte.setUTCMonth(dte.getUTCMonth() - months)
            start = dte.toISOString().slice(0, 10)
          }
          return start
        })(),
        project_end: (() => {
          const start = parsed?.project_start?.trim() || null
          let end = parsed?.project_end?.trim() || null
          const months = parsed?.duration_months
          if (months && start && !end) {
            const dte = new Date(`${start}T12:00:00Z`)
            dte.setUTCMonth(dte.getUTCMonth() + months)
            end = dte.toISOString().slice(0, 10)
          }
          return end
        })(),
      })
      .select('id')
      .single()

    if (insertRefError || !refRow?.id) return

    referenceIds.push(refRow.id)
    created++
  }

  if (useGroups) {
    for (const group of groups) {
      const groupFiles = files.slice(fileIndex, fileIndex + group.fileCount)
      fileIndex += group.fileCount
      await processGroup(groupFiles, group)
    }
  } else {
    for (const file of files) {
      await processGroup([file])
    }
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.root)
  revalidateOrgReferences(organizationId)
  return { success: true, created, referenceIds, organizationId }
}
