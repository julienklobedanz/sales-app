'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export type PdfLayoutKey = 'one_pager' | 'detail' | 'anonymized'

export type ExportSettings = {
  pdf_layout?: PdfLayoutKey
  pdf_logo_enabled?: boolean
}

export type UpdateExportSettingsResult =
  | { success: true }
  | { success: false; error: string }

export async function updateExportSettings(
  organizationId: string,
  next: ExportSettings
): Promise<UpdateExportSettingsResult> {
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

  if (!profile?.organization_id || profile.organization_id !== organizationId) {
    return { success: false, error: 'Keine Berechtigung für diesen Arbeitsbereich.' }
  }

  const safe: ExportSettings = {
    pdf_layout:
      next.pdf_layout === 'detail' || next.pdf_layout === 'anonymized'
        ? next.pdf_layout
        : 'one_pager',
    pdf_logo_enabled: Boolean(next.pdf_logo_enabled),
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      export_settings: safe,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}

