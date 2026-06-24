'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference } from '@/lib/cache/revalidate-org'

export async function attachBulkImportFileToReference(params: {
  referenceId: string
  file_path: string
  file_name: string
  file_type: string | null
  original_document_url: string | null
  setAsPrimary: boolean
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const referenceId = String(params.referenceId ?? '').trim()
  const file_path = String(params.file_path ?? '').trim()
  if (!referenceId || !file_path) {
    return { success: false, error: 'Ungültige Parameter.' }
  }

  const { error: assetErr } = await supabase.from('reference_assets').insert({
    reference_id: referenceId,
    file_path,
    file_name: params.file_name,
    file_type: params.file_type,
    category: 'other',
  })

  if (assetErr) return { success: false, error: assetErr.message }

  if (params.setAsPrimary) {
    const { error: refErr } = await supabase
      .from('references')
      .update({
        file_path,
        original_document_url: params.original_document_url,
      })
      .eq('id', referenceId)
    if (refErr) return { success: false, error: refErr.message }
  }

  revalidatePath(ROUTES.evidence.root)
  revalidatePath(ROUTES.evidence.edit(referenceId))
  await revalidateOrgCachesForReference(referenceId)
  return { success: true }
}
