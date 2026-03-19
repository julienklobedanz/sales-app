/**
 * RFP Analyzer & Matcher – Platzhalter für Extraktion aus PDF und Matching gegen Success Stories (references).
 * Später: echte PDF-Parsing-Pipeline + Embedding-Match oder LLM.
 */

export type ExtractedRequirement = {
  id: string
  text: string
  category?: string
}

export type RfpMatchResult = {
  requirements: ExtractedRequirement[]
  matchedReferenceIds: string[]
  /** Kurzbeschreibung pro Match (optional) */
  matchSnippets?: Record<string, string>
}

/**
 * Simulierte Extraktion von Anforderungen aus einem RFP-PDF.
 * Später: pdf-parse + LLM/Structured Output.
 */
export async function extractRequirementsFromPdf(
  _file: File
): Promise<ExtractedRequirement[]> {
  await new Promise((r) => setTimeout(r, 600))

  return [
    { id: 'req-1', text: 'Cloud-Migration und Hybrid-Infrastruktur', category: 'Technologie' },
    { id: 'req-2', text: 'Branchenerfahrung Automotive', category: 'Branche' },
    { id: 'req-3', text: 'Skalierbare Implementierung innerhalb von 12 Monaten', category: 'Projekt' },
  ]
}

/**
 * Matcht extrahierte Anforderungen gegen Referenzen (Success Stories).
 * Später: echte Semantik/Embedding-Match über references-Tabelle.
 */
export async function matchRequirementsToReferences(
  _requirements: ExtractedRequirement[],
  referenceIds: string[],
  _referenceDetails?: { id: string; title: string; industry?: string; tags?: string }[]
): Promise<{ matchedIds: string[]; matchSnippets: Record<string, string> }> {
  await new Promise((r) => setTimeout(r, 400))

  const matchedIds = referenceIds.slice(0, 5)
  const matchSnippets: Record<string, string> = {}
  matchedIds.forEach((id) => {
    matchSnippets[id] = 'Relevante Success Story zu Cloud und Branche.'
  })
  return { matchedIds, matchSnippets }
}
