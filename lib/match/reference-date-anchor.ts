/**
 * Datum für Aktualitäts-/Jahresfilter: Projektende → Projektstart → created_at.
 */
export function matchReferenceDateAnchor(fields: {
  projectEnd?: string | null
  projectStart?: string | null
  createdAt?: string | null
}): string | null {
  const end = fields.projectEnd?.trim()
  if (end) return end
  const start = fields.projectStart?.trim()
  if (start) return start
  const created = fields.createdAt?.trim()
  return created || null
}
