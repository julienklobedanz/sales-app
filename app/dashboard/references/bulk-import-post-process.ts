'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { applyBulkImportExtractionFromBuffer } from '@/lib/references/bulk-import-extraction-apply'
import type { BulkImportExtractionResult } from '@/lib/references/bulk-import-review-types'

/**
 * Fallback: Extraktion aus Storage (wenn keine Datei mehr im Browser verfügbar).
 */
export async function runBulkImportExtractionForReference(
  referenceId: string
): Promise<BulkImportExtractionResult> {
  const id = String(referenceId ?? '').trim()
  if (!id) return { success: false, error: 'Ungültige Referenz.' }

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
    return { success: false, error: 'Nur Admins können den Import abschließen.' }
  }
  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { success: false, error: 'Keine Organisation.' }

  const { data: ref } = await supabase
    .from('references')
    .select('id, file_path, company_id')
    .eq('id', id)
    .maybeSingle()

  if (!ref) return { success: false, error: 'Referenz nicht gefunden.' }

  const { data: assets } = await supabase
    .from('reference_assets')
    .select('file_path, file_name')
    .eq('reference_id', id)
    .order('created_at', { ascending: true })
    .limit(1)

  const path = assets?.[0]?.file_path ?? (ref.file_path as string | null) ?? null
  const fileName = assets?.[0]?.file_name ?? path?.split('/').pop() ?? 'document.pdf'

  if (!path) {
    revalidatePath(ROUTES.evidence.root)
    return {
      success: true,
      referenceId: id,
      title: '',
      needsInput: true,
      extractionOk: false,
      extractionError:
        'Keine Datei am Import gefunden. Storage-Bucket „references“ prüfen oder Import erneut mit PDF starten.',
      suggestions: {},
    }
  }

  const { data: blob, error: dlErr } = await supabase.storage.from('references').download(path)
  if (dlErr || !blob) {
    revalidatePath(ROUTES.evidence.root)
    return {
      success: true,
      referenceId: id,
      title: '',
      needsInput: true,
      extractionOk: false,
      extractionError: dlErr?.message ?? 'Datei konnte nicht aus dem Storage geladen werden.',
      suggestions: {},
    }
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  const result = await applyBulkImportExtractionFromBuffer(
    supabase,
    organizationId,
    id,
    buffer,
    fileName
  )

  revalidatePath(ROUTES.evidence.root)
  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.edit(id))

  return result
}
