'use client'

import { createClient } from '@/lib/supabase/client'
import { attachBulkImportFileToReference } from '@/app/dashboard/references/bulk-import-attach'

/**
 * Lädt Import-Dateien clientseitig in Storage (wie „Referenz erstellen“) — Server-Upload scheitert oft an Storage-RLS.
 */
export async function uploadBulkImportFilesForReference(
  organizationId: string,
  referenceId: string,
  files: File[]
): Promise<{ ok: boolean; error?: string }> {
  if (!organizationId?.trim() || !referenceId?.trim() || files.length === 0) {
    return { ok: false, error: 'Upload-Parameter unvollständig.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nicht angemeldet.' }

  let firstPath: string | null = null

  for (const file of files) {
    if (!file?.name?.trim() || file.size === 0) continue
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${organizationId}/${referenceId}/${Date.now()}-${safeName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('references')
      .upload(storagePath, file, { upsert: false })

    if (uploadError || !uploadData?.path) {
      const raw = uploadError?.message ?? 'Datei konnte nicht hochgeladen werden.'
      const error =
        /bucket not found/i.test(raw)
          ? 'Storage-Bucket „references“ ist nicht angelegt. Bitte Supabase-Migrationen ausführen (20260510220000_references_storage_bucket.sql).'
          : raw
      return { ok: false, error }
    }

    const { data: publicUrlData } = supabase.storage.from('references').getPublicUrl(uploadData.path)
    const publicUrl = publicUrlData?.publicUrl ?? null
    const ext = file.name.includes('.') ? (file.name.split('.').pop() ?? '') : ''

    const attach = await attachBulkImportFileToReference({
      referenceId,
      file_path: uploadData.path,
      file_name: file.name,
      file_type: ext || null,
      original_document_url: publicUrl,
      setAsPrimary: !firstPath,
    })

    if (!attach.success) {
      return { ok: false, error: attach.error }
    }

    if (!firstPath) {
      firstPath = uploadData.path
    }
  }

  if (!firstPath) {
    return { ok: false, error: 'Keine Datei konnte gespeichert werden.' }
  }

  return { ok: true }
}
