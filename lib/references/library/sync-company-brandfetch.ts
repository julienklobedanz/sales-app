'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  syncExistingAccountBrandfetch,
  type ResolveAccountForImportResult,
} from '@/lib/accounts/resolve-account-for-import'
import {
  brandfetchLogoUrlLooksLightTheme,
  rewriteBrandfetchLogoUrlForLightBackground,
} from '@/lib/brandfetch/logo-theme-url'

/** Brandfetch-Abgleich für einen bestehenden Account (Bearbeiten / Nachimport). */
export async function syncCompanyBrandfetchForEdit(
  companyId: string,
): Promise<ResolveAccountForImportResult> {
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

  return syncExistingAccountBrandfetch(supabase, organizationId, companyId)
}

/**
 * Logo fehlt / Bild lädt nicht: Brandfetch erneut (Logo + HQ, Website, Mitarbeiter, Branche).
 * `failedLogoUrl` = defekte URL → alternatives Logo-Format aus Brandfetch.
 */
export async function refreshCompanyBrandfetchOnLogoIssue(
  companyId: string,
  failedLogoUrl?: string | null,
): Promise<ResolveAccountForImportResult> {
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

  return syncExistingAccountBrandfetch(supabase, organizationId, companyId, {
    excludeLogoUrl: failedLogoUrl ?? null,
  })
}

/** Referenzierte Accounts ohne Logo/Branche nachziehen (Seitenaufruf / Client-Refresh). */
export async function enrichReferencedCompaniesMissingBrandfetch(
  companyIds: string[],
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

    const result = await syncExistingAccountBrandfetch(
      supabase,
      organizationId,
      companyId,
    )
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

/**
 * Alle Brandfetch-Logos der Organisation von theme/light → theme/dark (weiße UI-Zellen).
 * Kein Brandfetch-API-Call — nur URL-Rewrite in der DB.
 */
export async function upgradeAllOrganizationBrandfetchLogosToDark(): Promise<{
  updated: number
  checked: number
}> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { updated: 0, checked: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { updated: 0, checked: 0 }

  const { data: rows, error } = await supabase
    .from('companies')
    .select('id, logo_url')
    .eq('organization_id', organizationId)
    .ilike('logo_url', '%theme/light%')
    .limit(500)

  if (error || !rows?.length) return { updated: 0, checked: rows?.length ?? 0 }

  let updated = 0
  for (const row of rows) {
    const before = String(row.logo_url ?? '').trim()
    if (!brandfetchLogoUrlLooksLightTheme(before)) continue
    const next = rewriteBrandfetchLogoUrlForLightBackground(before)
    if (!next || next === before) continue
    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: next })
      .eq('id', row.id)
      .eq('organization_id', organizationId)
    if (!updateError) updated += 1
  }

  return { updated, checked: rows.length }
}
