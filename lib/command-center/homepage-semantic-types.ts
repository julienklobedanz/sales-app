export type HomepageSemanticReferenceHit = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
  snippet: string
  companyName: string | null
  companyId: string | null
  companyLogoUrl: string | null
  volumeEur: string | null
  /** ISO-Timestamp für Meta-Zeile (Aktualität). */
  createdAt: string | null
}

export type HomepageSemanticSearchResult =
  | { success: true; query: string; hits: HomepageSemanticReferenceHit[] }
  | { success: false; query: string; error: string }
