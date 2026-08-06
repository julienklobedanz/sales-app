import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import {
  normalizeAccountStatus,
  type AccountStatusValue,
} from '@/lib/accounts/account-status'
import type { PartnerCategory } from '@/lib/accounts/account-entity'
import { parseAccountsImportRow } from '@/lib/accounts/accounts-import-parse'
import { enrichBulkImportRowFromBrandfetch } from '@/lib/accounts/resolve-account-for-import'
import { ensureBrandfetchDarkLogoUrl } from '@/lib/brandfetch/logo-theme-url'
import {
  discoverAndSaveCompanyNewsrooms,
  scheduleCompanyNewsroomDiscovery,
} from '@/lib/market-signals/discover-company-newsroom'
import { log } from '@/lib/observability/logger'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'

/** Setzt nur `account_status`. Stammdaten inkl. Status: {@link updateCompany}. */
export async function updateCompanyAccountStatusImpl(
  companyId: string,
  account_status: AccountStatusValue | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('companies')
    .update({
      account_status,
      account_status_source: account_status ? 'manual' : 'crm',
    })
    .eq('id', companyId)
  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function toggleCompanyFavoriteImpl(
  companyId: string,
  isFavorite: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('companies')
    .update({ is_favorite: isFavorite })
    .eq('id', companyId)
  if (error) {
    if ((error.message ?? '').includes('is_favorite')) {
      return {
        success: false,
        error:
          "Favoriten sind in deiner DB noch nicht aktiviert (Spalte 'companies.is_favorite' fehlt). Bitte Migration ausführen und Schema-Cache refreshen.",
      }
    }
    return { success: false, error: error.message }
  }
  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

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

export async function createPartnerImpl(payload: {
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  description?: string | null
  partner_category: PartnerCategory
  alsoCreateAccount?: boolean
}): Promise<
  { success: true; id: string; accountId?: string } | { success: false; error: string }
> {
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

  const baseFields = {
    organization_id: profile.organization_id,
    name,
    website_url: payload.website_url?.trim() || null,
    industry: payload.industry?.trim() || null,
    headquarters: payload.headquarters?.trim() || null,
    logo_url: ensureBrandfetchDarkLogoUrl(payload.logo_url?.trim() || null),
    description: payload.description?.trim() || null,
  }

  let linkedAccountId: string | null = null

  if (payload.alsoCreateAccount) {
    const { data: accountRow, error: accountError } = await supabase
      .from('companies')
      .insert({
        ...baseFields,
        entity_kind: 'account',
        account_status: null,
      })
      .select('id')
      .single()

    if (accountError) return { success: false, error: accountError.message }
    linkedAccountId = accountRow?.id ?? null
    if (linkedAccountId) {
      scheduleCompanyNewsroomDiscovery(supabase, linkedAccountId, baseFields.website_url)
    }
  }

  const { data: partnerRow, error: partnerError } = await supabase
    .from('companies')
    .insert({
      ...baseFields,
      entity_kind: 'partner',
      partner_category: payload.partner_category,
      linked_account_id: linkedAccountId,
      account_status: null,
    })
    .select('id')
    .single()

  if (partnerError) {
    if (linkedAccountId) {
      await supabase.from('companies').delete().eq('id', linkedAccountId)
    }
    return { success: false, error: partnerError.message }
  }

  revalidatePath(ROUTES.accounts)
  return {
    success: true,
    id: partnerRow!.id,
    accountId: linkedAccountId ?? undefined,
  }
}

export async function bulkCreateCompaniesFromSheetImpl(
  fileBuffer: Uint8Array,
  options: { entityKind?: 'account' | 'partner' } = {},
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

  const entityKind = options.entityKind === 'partner' ? 'partner' : 'account'

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
    .eq('entity_kind', entityKind)
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
    const parsed = parseAccountsImportRow(row, entityKind)
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

    const partner_category = parsed.partnerCategory

    const { data: inserted, error } = await supabase
      .from('companies')
      .insert({
        organization_id: profile.organization_id,
        entity_kind: entityKind,
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
        ...(entityKind === 'partner' ? { partner_category } : {}),
      })
      .select('id')
      .maybeSingle()
    if (error) {
      failedCount += 1
      continue
    }
    if (inserted?.id && entityKind === 'account') {
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

export async function updateCompanyImpl(payload: {
  id: string
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; error?: string }> {
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

  const account_status = normalizeAccountStatus(payload.account_status)

  const { data: row, error: fetchError } = await supabase
    .from('companies')
    .select('id, organization_id, website_url')
    .eq('id', payload.id)
    .single()

  if (fetchError || !row) return { success: false, error: 'Account nicht gefunden.' }
  if (row.organization_id !== profile.organization_id) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  const nextWebsite = payload.website_url?.trim() || null
  const prevWebsite = row.website_url ?? null

  const { error } = await supabase
    .from('companies')
    .update({
      name,
      website_url: nextWebsite,
      industry: payload.industry?.trim() || null,
      headquarters: payload.headquarters?.trim() || null,
      logo_url: ensureBrandfetchDarkLogoUrl(payload.logo_url?.trim() || null),
      employee_count: payload.employee_count ?? null,
      description: payload.description?.trim() || null,
      account_status,
    })
    .eq('id', payload.id)
    .eq('organization_id', profile.organization_id)

  if (error) return { success: false, error: error.message }

  if (nextWebsite && nextWebsite !== prevWebsite) {
    void discoverAndSaveCompanyNewsrooms(supabase, payload.id, {
      websiteUrl: nextWebsite,
      force: true,
    }).catch((err) => {
      log.error('newsroomDiscover.companyUpdateFailed', { companyId: payload.id }, err)
    })
  }

  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(payload.id))
  return { success: true }
}

export async function deleteCompanyWithDataImpl(
  companyId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id)
    return { success: false, error: 'Onboarding unvollständig.' }
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (profileIsSalesRestricted(systemRole, functionRole)) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, organization_id')
    .eq('id', companyId)
    .single()
  if (companyErr || !company) return { success: false, error: 'Account nicht gefunden.' }
  if (company.organization_id !== profile.organization_id) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  // Optional: weitere abhängige Daten explizit löschen, falls kein ON DELETE CASCADE konfiguriert ist.
  // Referenzen
  await supabase.from('references').delete().eq('company_id', companyId)
  // Deals
  await supabase.from('deals').delete().eq('company_id', companyId)
  // Strategy
  await supabase.from('company_strategies').delete().eq('company_id', companyId)
  // Roadmap-Projekte
  await supabase.from('company_roadmap_projects').delete().eq('company_id', companyId)
  // Stakeholder
  await supabase.from('stakeholders').delete().eq('company_id', companyId)

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)
    .eq('organization_id', profile.organization_id)
  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.accounts)
  return { success: true }
}
