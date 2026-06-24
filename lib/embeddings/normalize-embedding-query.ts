/** Normalisiert finalen Query-Text für stabilen Embedding-Cache-Key (Whitespace only). */
export function normalizeEmbeddingQueryText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}
