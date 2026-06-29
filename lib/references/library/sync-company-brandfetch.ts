'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  resolveOrCreateCompanyForImport,
  syncExistingCompanyBrandfetch,
  type ResolveCompanyForImportResult,
} from '@/lib/accounts/resolve-company-for-import'

/** Brandfetch-Abgleich für einen bestehenden Account (Bearbeiten / Nachimport). */
export async function syncCompanyBrandfetchForEdit(
  companyId: string
): Promise<ResolveCompanyForImportResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { success: false, error: 'Keine Organisation.' }

  return syncExistingCompanyBrandfetch(supabase, organizationId, companyId)
}

/**
 * Logo fehlt / Bild lädt nicht: Brandfetch erneut (Logo + HQ, Website, Mitarbeiter, Branche).
 * `failedLogoUrl` = defekte URL → alternatives Logo-Format aus Brandfetch.
 */
export async function refreshCompanyBrandfetchOnLogoIssue(
  companyId: string,
  failedLogoUrl?: string | null
): Promise<ResolveCompanyForImportResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { success: false, error: 'Keine Organisation.' }

  return syncExistingCompanyBrandfetch(supabase, organizationId, companyId, {
    excludeLogoUrl: failedLogoUrl ?? null,
  })
}

/** Referenzierte Accounts ohne Logo/Branche nachziehen (Seitenaufruf / Client-Refresh). */
export async function enrichReferencedCompaniesMissingBrandfetch(
  companyIds: string[]
): Promise<{ synced: number; failed: number }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { synced: 0, failed: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { synced: 0, failed: 0 }

  const unique = [...new Set(companyIds.filter(Boolean))].slice(0, 20)
  let synced = 0
  let failed = 0

  for (const companyId of unique) {
    const { data: row } = await supabase
      .from('companies')
      .select('logo_url, industry, website_url')
      .eq('id', companyId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    const hasLogo = Boolean(row?.logo_url?.trim())
    const hasIndustry = Boolean(row?.industry?.trim())
    if (hasLogo && hasIndustry) continue

    const result = await syncExistingCompanyBrandfetch(supabase, organizationId, companyId)
    if (result.success && result.company) {
      const gotLogo = Boolean(result.company.logo_url?.trim())
      const gotIndustry = Boolean(result.company.industry?.trim())
      if (gotLogo || gotIndustry) synced += 1
      else failed += 1
    } else {
      failed += 1
    }
  }

  return { synced, failed }
}

/** Nach Firmennamen (z. B. aus PDF) — findet „Aurubis“ statt neu „Aurubis AG“. */
export async function syncCompanyBrandfetchByName(
  companyName: string
): Promise<ResolveCompanyForImportResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { success: false, error: 'Keine Organisation.' }

  return resolveOrCreateCompanyForImport(supabase, organizationId, companyName.trim())
}
