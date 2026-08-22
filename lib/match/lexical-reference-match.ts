/**
 * Lexikalisches Matching für Account-/Marken- und Titel-Teiltreffer.
 * Kurze Queries („Arla“, „passagier“) erreichen per Embedding oft nicht den
 * Cosine-Threshold — hier greifen Name, Titel und Summary.
 */

/** Kalibriert an UI-Bändern in `getMatchStrength` (≥0.65 Sehr hoch, ≥0.55 Hoch). */
export const LEXICAL_SCORE_EXACT_COMPANY = 0.78
export const LEXICAL_SCORE_COMPANY_CONTAINS = 0.68
export const LEXICAL_SCORE_TITLE_CONTAINS = 0.62
export const LEXICAL_SCORE_SUMMARY_CONTAINS = 0.52

const STOPWORDS = new Set([
  'und',
  'oder',
  'für',
  'mit',
  'ohne',
  'eine',
  'einer',
  'eines',
  'einem',
  'einen',
  'der',
  'die',
  'das',
  'dem',
  'den',
  'des',
  'im',
  'in',
  'am',
  'an',
  'auf',
  'aus',
  'bei',
  'von',
  'zum',
  'zur',
  'über',
  'unter',
  'nach',
  'vor',
  'projekte',
  'projekt',
  'referenz',
  'referenzen',
  'suche',
  'zeig',
  'zeige',
  'mir',
  'bitte',
])

export function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/** Kleinschreibung + Bindestriche/Spaces entfernen (Passagierfluss-Analyse ↔ passagierfluss). */
function normalizeLexicalText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[-–—_/.,;:()[\]{}]+/g, '')
    .replace(/\s+/g, '')
}

export function textContainsNeedle(haystack: string, needle: string): boolean {
  const h = haystack.trim().toLowerCase()
  const n = needle.trim().toLowerCase()
  if (!h || !n || n.length < 2) return false
  if (h.includes(n)) return true
  const hn = normalizeLexicalText(h)
  const nn = normalizeLexicalText(n)
  return nn.length >= 3 && hn.includes(nn)
}

/**
 * Suchnadeln: voller Query + bei kurzen Anfragen auch Einzel-Tokens
 * (damit „passagier“ und „zeig mir passagier“ den Titel treffen).
 */
export function lexicalSearchNeedles(query: string): string[] {
  const full = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (full.length < 2) return []

  const needles = new Set<string>()
  needles.add(full)

  const tokens = full
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))

  // Nur bei kurzen Queries Tokens einzeln matchen — sonst rauschen lange Semantik-Queries.
  if (tokens.length > 0 && tokens.length <= 5 && full.length <= 64) {
    for (const t of tokens) needles.add(t)
  }

  return [...needles]
}

/**
 * Score 0–1 wenn Query (oder Token) in Firma/Titel/Summary vorkommt, sonst null.
 */
export function scoreLexicalReferenceMatch(
  query: string,
  companyName: string | null | undefined,
  title: string | null | undefined,
  summary?: string | null | undefined,
): number | null {
  const needles = lexicalSearchNeedles(query)
  if (!needles.length) return null

  const company = (companyName ?? '').trim()
  const t = (title ?? '').trim()
  const s = (summary ?? '').trim()

  let best: number | null = null
  const bump = (score: number) => {
    best = best == null ? score : Math.max(best, score)
  }

  for (const needle of needles) {
    if (company) {
      if (company.toLowerCase() === needle) bump(LEXICAL_SCORE_EXACT_COMPANY)
      else if (textContainsNeedle(company, needle)) bump(LEXICAL_SCORE_COMPANY_CONTAINS)
    }
    if (t && textContainsNeedle(t, needle)) bump(LEXICAL_SCORE_TITLE_CONTAINS)
    if (s && needle.length >= 4 && textContainsNeedle(s, needle)) {
      bump(LEXICAL_SCORE_SUMMARY_CONTAINS)
    }
  }

  return best
}

/** Embedding-Text an Index-Struktur anbinden, wenn die Query exakt ein Account ist. */
export function enrichEmbedQueryForExactCompany(
  query: string,
  matchedCompanyNames: string[],
): string {
  const q = query.trim()
  if (!q || matchedCompanyNames.length === 0) return q
  const exact = matchedCompanyNames.find(
    (n) => n.trim().toLowerCase() === q.toLowerCase(),
  )
  if (!exact) return q
  return `Kunde/Account: ${exact.trim()}\n${q}`
}

export function mergeMatchHitsByMaxSimilarity<
  T extends { id: string; similarity: number },
>(primary: T[], secondary: T[]): T[] {
  const byId = new Map<string, T>()
  for (const hit of primary) {
    byId.set(hit.id, hit)
  }
  for (const hit of secondary) {
    const existing = byId.get(hit.id)
    if (!existing || hit.similarity > existing.similarity) {
      byId.set(hit.id, existing ? { ...existing, similarity: hit.similarity } : hit)
    }
  }
  return [...byId.values()]
}
