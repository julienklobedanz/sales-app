'use client'

import type { BulkImportExtractionResult } from '@/lib/references/bulk-import-review-types'

/** Extraktion aus der noch im Browser vorliegenden Datei (unabhängig vom Storage-Upload). */
export async function extractBulkImportReferenceFromFile(
  referenceId: string,
  file: File,
): Promise<BulkImportExtractionResult> {
  const formData = new FormData()
  formData.append('referenceId', referenceId)
  formData.append('file', file)

  const res = await fetch('/api/bulk-import/extract', {
    method: 'POST',
    body: formData,
  })

  const json = (await res.json()) as BulkImportExtractionResult & { error?: string }
  if (!res.ok && !json.success) {
    return {
      success: false,
      error: json.error ?? 'Extraktion fehlgeschlagen.',
    }
  }
  return json
}
