export type HomepageSemanticReferenceHit = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
  snippet: string
  companyName: string | null
  volumeEur: string | null
}

export type HomepageSemanticSearchResult =
  | { success: true; query: string; hits: HomepageSemanticReferenceHit[] }
  | { success: false; query: string; error: string }
