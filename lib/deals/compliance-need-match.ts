import { normalizeToken } from '@/lib/deals/normalize-token'

/** Derselbe Textabgleich wie die Lücken-Karte — für Sheet-Vorschläge, nicht als Urteil. */
export function complianceNeedMatchesBlob(need: string, blob: string): boolean {
  const n = normalizeToken(need)
  if (!n) return false
  const h = normalizeToken(blob)
  return (
    h.includes(n) || n.split(' ').some((part) => part.length >= 3 && h.includes(part))
  )
}

export function complianceDocMatchesNeed(
  doc: { document_type: string; title: string },
  need: string,
): boolean {
  return complianceNeedMatchesBlob(need, `${doc.document_type} ${doc.title}`)
}
