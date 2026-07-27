'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { asTableUpdate } from '@/lib/supabase/db-types'
import { ROUTES } from '@/lib/routes'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { normalizeUiLocale, UI_LOCALE_COOKIE, type UiLocale } from '@/lib/i18n/ui-locale'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import {
  normalizeSubdomainInput,
  validateSubdomainFormat,
} from '@/lib/organizations/subdomain'
import { parseDigestTimezone } from '@/lib/market-signals/digest-schedule'
import type { OrganizationBillingSettings } from '@/lib/organizations/billing-settings'

export type UpdateOrganizationResult =
  | { success: true }
  | { success: false; error: string }

export async function updateOrganization(
  organizationId: string,
  name: string,
  logoDataUrl?: string | null,
  primaryColor?: string | null,
  secondaryColor?: string | null,
  dateDisplayFormat?: string | null,
  uiLocale?: string | null,
  subdomain?: string | null,
  billingSettings?: Partial<OrganizationBillingSettings> | null
): Promise<UpdateOrganizationResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()

  if (profile?.organization_id !== organizationId) {
    return { success: false, error: 'Keine Berechtigung für diesen Arbeitsbereich.' }
  }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Name darf nicht leer sein.' }

  const updates: Record<string, unknown> = {
    name: trimmed,
    updated_at: new Date().toISOString(),
  }

  if (logoDataUrl !== undefined) {
    updates.logo_url = logoDataUrl || null
  }
  if (primaryColor !== undefined) {
    updates.primary_color = primaryColor || '#2563EB'
  }
  if (secondaryColor !== undefined) {
    updates.secondary_color = secondaryColor || '#1D4ED8'
  }
  if (dateDisplayFormat !== undefined) {
    updates.date_display_format = normalizeOrgDateDisplayFormat(dateDisplayFormat)
  }

  let normalizedSubdomain: string | null | undefined
  if (subdomain !== undefined) {
    normalizedSubdomain = normalizeSubdomainInput(subdomain ?? '') || null
    if (normalizedSubdomain) {
      const formatError = validateSubdomainFormat(normalizedSubdomain)
      if (formatError) return { success: false, error: formatError }
      const availability = await checkSubdomainAvailability(normalizedSubdomain, organizationId)
      if (!availability.available) {
        return { success: false, error: availability.error ?? 'Subdomain ist nicht verfügbar.' }
      }
    }
    updates.subdomain = normalizedSubdomain
  }

  let nextLocale: UiLocale | null = null
  const needsApiMerge = uiLocale !== undefined || billingSettings != null
  if (needsApiMerge) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('api_settings')
      .eq('id', organizationId)
      .maybeSingle()
    const prev =
      orgRow?.api_settings && typeof orgRow.api_settings === 'object' && !Array.isArray(orgRow.api_settings)
        ? { ...(orgRow.api_settings as Record<string, unknown>) }
        : {}

    if (uiLocale !== undefined) {
      nextLocale = normalizeUiLocale(uiLocale)
      prev.ui_locale = nextLocale
    }
    if (billingSettings) {
      if (billingSettings.companyAddress !== undefined) {
        prev.billing_company_address = billingSettings.companyAddress.trim() || null
      }
      if (billingSettings.vatId !== undefined) {
        prev.billing_vat_id = billingSettings.vatId.trim() || null
      }
      if (billingSettings.defaultTimezone !== undefined) {
        prev.default_timezone = parseDigestTimezone(billingSettings.defaultTimezone)
      }
      if (billingSettings.inviteAllowedEmailDomains !== undefined) {
        prev.invite_allowed_email_domains =
          billingSettings.inviteAllowedEmailDomains.trim() || null
      }
    }
    updates.api_settings = prev
  }

  const { error } = await supabase
    .from('organizations')
    .update(asTableUpdate<'organizations'>(updates))
    .eq('id', organizationId)

  if (error) {
    if (error.code === '23505' || /subdomain|unique/i.test(error.message)) {
      return { success: false, error: 'Subdomain ist bereits vergeben.' }
    }
    return { success: false, error: error.message }
  }

  if (nextLocale) {
    const jar = await cookies()
    jar.set(UI_LOCALE_COOKIE, nextLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.references.root)
  return { success: true }
}

export async function checkSubdomainAvailability(
  subdomain: string,
  organizationId: string
): Promise<{ available: boolean; error?: string }> {
  const normalized = normalizeSubdomainInput(subdomain)
  if (!normalized) return { available: true }

  const formatError = validateSubdomainFormat(normalized)
  if (formatError) return { available: false, error: formatError }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { available: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.organization_id !== organizationId) {
    return { available: false, error: 'Keine Berechtigung.' }
  }

  // Service-Role weil Uniqueness über alle Tenants geprüft werden muss / Grenze: nur Verfügbarkeit.
  const admin = createServiceRoleSupabaseClient()
  const client = admin ?? supabase

  const { data, error } = await client
    .from('organizations')
    .select('id')
    .eq('subdomain', normalized)
    .neq('id', organizationId)
    .limit(1)

  if (error) return { available: false, error: error.message }
  if (data && data.length > 0) {
    return { available: false, error: 'Subdomain ist bereits vergeben.' }
  }
  return { available: true }
}

export async function deleteWorkspace(confirmSubdomain: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) return { success: false, error: 'Kein Workspace zugeordnet.' }

  const roles = parseProfileRoles(profile ?? {})
  if (!isSystemAdmin(roles.systemRole)) {
    return { success: false, error: 'Nur Owner/Admin können den Workspace löschen.' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subdomain')
    .eq('id', organizationId)
    .single()

  const expected = normalizeSubdomainInput(org?.subdomain ?? '')
  const typed = normalizeSubdomainInput(confirmSubdomain)
  if (!expected) {
    return {
      success: false,
      error: 'Bitte zuerst eine Subdomain setzen, bevor der Workspace gelöscht werden kann.',
    }
  }
  if (typed !== expected) {
    return { success: false, error: 'Subdomain stimmt nicht überein.' }
  }

  // Service-Role weil Org-Löschung alle Tenants-Daten und RLS-Grenzen umgeht / Grenze: nur eigene Org nach Admin+Confirm.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return { success: false, error: 'Workspace-Löschung ist serverseitig nicht konfiguriert.' }
  }

  const { error } = await admin.from('organizations').delete().eq('id', organizationId)
  if (error) return { success: false, error: error.message }

  await supabase.auth.signOut({ scope: 'global' })
  return { success: true }
}
