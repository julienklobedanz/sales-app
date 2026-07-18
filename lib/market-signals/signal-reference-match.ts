import type { MatchReferenceHit } from '@/app/dashboard/actions'

export type SignalMatchHit = {
  id: string
  title: string
  snippet: string
  companyName: string | null
  similarity: number
}

/** Suchtext für Embedding-Match aus Signal-Inhalt. */
export function buildSignalMatchQuery(input: {
  headline: string
  compellingEvent?: string | null
  companyName?: string | null
}): string {
  const headline = input.headline.trim()
  const event = String(input.compellingEvent ?? '').trim()
  const company = String(input.companyName ?? '').trim()
  const parts = [
    headline ? `Signal: ${headline}` : null,
    event ? `Kontext: ${event}` : null,
    company ? `Account: ${company}` : null,
  ].filter(Boolean)
  return parts.join('\n').slice(0, 1200)
}

export function toSignalMatchHit(hit: MatchReferenceHit): SignalMatchHit {
  return {
    id: hit.id,
    title: hit.title,
    snippet: hit.snippet || hit.summary?.trim() || hit.title,
    companyName: hit.companyName,
    similarity: hit.similarity,
  }
}

/** Kurzer Proof-Absatz für Outreach (ohne LLM). */
export function formatReferenceProofBlock(hit: SignalMatchHit): string {
  const title = hit.title.trim() || 'Referenz'
  const company = hit.companyName?.trim()
  const where = company ? ` (${company})` : ''
  const snippet = hit.snippet.replace(/\s+/g, ' ').trim()
  const short =
    snippet.length > 160 ? `${snippet.slice(0, 157).trim()}…` : snippet
  if (short && short.toLowerCase() !== title.toLowerCase()) {
    return `Ähnliche Situation: „${title}"${where} — ${short}`
  }
  return `Ähnliche Situation: „${title}"${where}.`
}

/**
 * Fügt Proof-Blöcke vor dem Abschluss (zwei Leerzeilen + Gruß) ein.
 * Basis-Entwurf bleibt unverändert; bei Toggle immer neu aus Base + Auswahl zusammensetzen.
 */
export function composeOutreachWithProofBlocks(baseDraft: string, blocks: string[]): string {
  const base = baseDraft.replace(/\s+$/u, '')
  if (!blocks.length) return base

  const proof = blocks.map((b) => b.trim()).filter(Boolean).join('\n\n')
  if (!proof) return base

  const sep = '\n\n\n'
  const idx = base.lastIndexOf(sep)
  if (idx >= 0) {
    const before = base.slice(0, idx).replace(/\s+$/u, '')
    const after = base.slice(idx + sep.length)
    return `${before}\n\n${proof}${sep}${after}`
  }
  return `${base}\n\n${proof}`
}

export function matchingReferencesLabel(count: number): string {
  if (count === 1) return '1 passende Referenz'
  return `${count} passende Referenzen`
}
