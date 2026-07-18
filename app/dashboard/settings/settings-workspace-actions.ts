'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asTableUpdate } from '@/lib/supabase/db-types'
import { ROUTES } from '@/lib/routes'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { normalizeUiLocale, UI_LOCALE_COOKIE, type UiLocale } from '@/lib/i18n/ui-locale'

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
  uiLocale?: string | null
): Promise<UpdateOrganizationResult> {
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

  let nextLocale: UiLocale | null = null
  if (uiLocale !== undefined) {
    nextLocale = normalizeUiLocale(uiLocale)
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('api_settings')
      .eq('id', organizationId)
      .maybeSingle()
    const prev =
      orgRow?.api_settings && typeof orgRow.api_settings === 'object' && !Array.isArray(orgRow.api_settings)
        ? { ...(orgRow.api_settings as Record<string, unknown>) }
        : {}
    updates.api_settings = { ...prev, ui_locale: nextLocale }
  }

  const { error } = await supabase
    .from('organizations')
    .update(asTableUpdate<'organizations'>(updates))
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }

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
