export const DEAL_DOCUMENTS_BUCKET = 'deal-documents'
export const RFP_DOCUMENTS_BUCKET = 'rfp-documents'

/** Deduplizierte, nicht-leere Storage-Pfade für remove()-Batch. */
export function uniqueStoragePaths(paths: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  for (const raw of paths) {
    const p = raw?.trim()
    if (p) seen.add(p)
  }
  return [...seen]
}
