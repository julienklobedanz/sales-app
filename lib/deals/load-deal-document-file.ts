import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

const DEAL_DOCUMENTS_BUCKET = 'deal-documents'

export type DealDocumentStorageRow = {
  id: string
  deal_id: string
  organization_id: string
  file_name: string
  kind: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
}

export async function loadDealDocumentAsFile(
  supabase: SupabaseClient,
  doc: Pick<DealDocumentStorageRow, 'storage_path' | 'file_name' | 'mime_type'>
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  const { data, error } = await supabase.storage
    .from(DEAL_DOCUMENTS_BUCKET)
    .download(doc.storage_path)

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Datei konnte nicht aus dem Speicher geladen werden.',
    }
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  const file = new File([buffer], doc.file_name, {
    type: doc.mime_type?.trim() || 'application/octet-stream',
  })

  return { ok: true, file }
}
