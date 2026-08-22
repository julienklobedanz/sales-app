import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import {
  normalizeAccountStatus,
} from '@/lib/accounts/account-status'
import { parseAccountsImportRow } from '@/lib/accounts/accounts-import-parse'
import { enrichBulkImportRowFromBrandfetch } from '@/lib/accounts/resolve-account-for-import'
import { ensureBrandfetchDarkLogoUrl } from '@/lib/brandfetch/logo-theme-url'
import { scheduleCompanyNewsroomDiscovery } from '@/lib/market-signals/discover-company-newsroom'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'

export async function createCompanyImpl(payload: {
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id)
    return { success: false, error: 'Onboarding unvollständig.' }
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (profileIsSalesRestricted(systemRole, functionRole))
    return { success: false, error: 'Keine Berechtigung.' }

  const name = payload.name.trim()
  if (!name) return { success: false, error: 'Name ist erforderlich.' }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      organization_id: profile.organization_id,
      entity_kind: 'account',
      name,
      website_url: payload.website_url?.trim() || null,
      industry: payload.industry?.trim() || null,
      headquarters: payload.headquarters?.trim() || null,
      logo_url: ensureBrandfetchDarkLogoUrl(payload.logo_url?.trim() || null),
      employee_count: payload.employee_count ?? null,
      description: payload.description?.trim() || null,
      account_status: normalizeAccountStatus(payload.account_status),
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  if (data?.id) {
    scheduleCompanyNewsroomDiscovery(
      supabase,
      data.id,
      payload.website_url?.trim() || null,
    )
  }

  revalidatePath(ROUTES.accounts)
  return { success: true, id: data?.id }
}

export async function bulkCreateCompaniesFromSheetImpl(
  fileBuffer: Uint8Array,
): Promise<{
  success: boolean
  createdCount: number
  skippedCount: number
  failedCount: number
  error?: string
}> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return {
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Nicht eingeloggt.',
    }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) {
    return {
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Onboarding unvollständig.',
    }
  }
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (profileIsSalesRestricted(systemRole, functionRole)) {
    return {
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Keine Berechtigung.',
    }
  }

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(fileBuffer, { type: 'array' })
  } catch {
    return {
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Datei konnte nicht gelesen werden.',
    }
  }
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return {
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Keine Tabelle gefunden.',
    }
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[firstSheetName]!,
    { defval: '' },
  )

  const { data: existingCompanies } = await supabase
    .from('companies')
    .select('name')
    .eq('organization_id', profile.organization_id)
    .eq('entity_kind', 'account')
  const existingNames = new Set(
    (existingCompanies ?? []).map((c) =>
      String(c.name ?? '')
        .trim()
        .toLowerCase(),
    ),
  )

  let createdCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const row of rows) {
    const parsed = parseAccountsImportRow(row)
    if (!parsed) {
      skippedCount += 1
      continue
    }
    const normalizedName = parsed.name.toLowerCase()
    if (existingNames.has(normalizedName)) {
      skippedCount += 1
      continue
    }

    const enriched = await enrichBulkImportRowFromBrandfetch({
      name: parsed.name,
      website: parsed.website,
      industry: parsed.industry,
      headquarters: parsed.headquarters,
      employeeCount: parsed.employeeCount,
    })

    const { data: inserted, error } = await supabase
      .from('companies')
      .insert({
        organization_id: profile.organization_id,
        entity_kind: 'account',
        name: enriched.name,
        website_url: enriched.website.trim() || null,
        industry: enriched.industry.trim() || null,
        headquarters: enriched.headquarters.trim() || null,
        employee_count:
          enriched.employeeCount != null && Number.isFinite(enriched.employeeCount)
            ? enriched.employeeCount
            : null,
        logo_url: ensureBrandfetchDarkLogoUrl(enriched.logo_url),
        description: enriched.description?.trim() || null,
        account_status: null,
      })
      .select('id')
      .maybeSingle()
    if (error) {
      failedCount += 1
      continue
    }
    if (inserted?.id) {
      scheduleCompanyNewsroomDiscovery(
        supabase,
        inserted.id,
        enriched.website.trim() || null,
      )
    }
    existingNames.add(normalizedName)
    createdCount += 1
  }

  revalidatePath(ROUTES.accounts)
  return { success: true, createdCount, skippedCount, failedCount }
}
