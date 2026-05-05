/**
 * Kontext-Hervorhebung für Referenz-Fließtexte: Begriffe aus Tags, Branche,
 * Tech-/Markt-Feldern und optionalem Workspace-Glossar (workflow_settings).
 */

const PHRASE_MIN_LEN = 2
const PHRASE_MAX_LEN = 64
const MAX_PHRASES = 48

/** Zu kurz oder zu generisch → würde fast alles fett markieren */
const PHRASE_BLOCKLIST = new Set(
  [
    'und',
    'oder',
    'der',
    'die',
    'das',
    'ein',
    'eine',
    'mit',
    'von',
    'zu',
    'auf',
    'für',
    'bei',
    'nach',
    'aus',
    'ist',
    'sind',
    'war',
    'wurde',
    'werden',
    'nicht',
    'auch',
    'nur',
    'sowie',
    'bzw',
    'etc',
    'it',
    'id',
    'nr',
    'ca',
    'bsp',
    'sonstige',
    'sonstiges',
    'diverse',
    'divers',
    'n/a',
    'tbd',
  ].map((s) => s.toLowerCase())
)

/** Zweizeichen-Tags nur wenn sinnvoll (z. B. KI, AI); nicht „IT“ */
const TWO_CHAR_ALLOWLIST = new Set(['ki', 'ai', 'bi'])

function normalizePhrase(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractWorkflowHighlightGlossary(workflowSettings: unknown): string[] {
  if (!workflowSettings || typeof workflowSettings !== 'object') return []
  const obj = workflowSettings as Record<string, unknown>
  const raw = obj.reference_highlight_glossary
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string').map((s) => normalizePhrase(s))
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[\n,;]+/)
      .map((s) => normalizePhrase(s))
      .filter(Boolean)
  }
  return []
}

function splitIndustrySegments(industry: string | null | undefined): string[] {
  if (!industry) return []
  const t = normalizePhrase(industry)
  if (!t) return []
  return t
    .split(/\s*[/|·,]+\s*|\s+und\s+|\s+&\s+/i)
    .map((s) => normalizePhrase(s))
    .filter(Boolean)
}

function splitListField(value: string | null | undefined): string[] {
  if (!value) return []
  return String(value)
    .split(/[,;\n]+/)
    .map((s) => normalizePhrase(s))
    .filter(Boolean)
}

function acceptPhrase(s: string): boolean {
  const t = normalizePhrase(s)
  const lower = t.toLowerCase()
  if (t.length < PHRASE_MIN_LEN || t.length > PHRASE_MAX_LEN) return false
  if (t.length === 2 && !TWO_CHAR_ALLOWLIST.has(lower)) return false
  if (PHRASE_BLOCKLIST.has(lower)) return false
  return true
}

export type BuildReferenceHighlightPhrasesInput = {
  tags: string[]
  industry: string | null | undefined
  incumbentProvider: string | null | undefined
  competitors: string | null | undefined
  glossary: string[]
}

/**
 * Eindeutige Phrasen (längere zuerst), für Wortgrenzen-Highlighting.
 */
export function buildReferenceHighlightPhrases(input: BuildReferenceHighlightPhrasesInput): string[] {
  const raw: string[] = []

  for (const t of input.tags ?? []) {
    const n = normalizePhrase(t)
    if (n) raw.push(n)
  }
  raw.push(...splitIndustrySegments(input.industry ?? null))
  raw.push(...splitListField(input.incumbentProvider ?? null))
  raw.push(...splitListField(input.competitors ?? null))
  for (const g of input.glossary ?? []) {
    const n = normalizePhrase(g)
    if (n) raw.push(n)
  }

  const seen = new Set<string>()
  const out: string[] = []
  for (const s of raw) {
    if (!acceptPhrase(s)) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }

  out.sort((a, b) => b.length - a.length || a.localeCompare(b, 'de'))
  return out.slice(0, MAX_PHRASES)
}

const NUMERIC_HIGHLIGHT_RE =
  /(\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s?%|\b(?:EUR|USD|AED|CHF|GBP|JPY|HKD|SGD|CNY|€|\$|£|¥)\s?\d[\d.,]*)/gi

export type HighlightSegment = { emph: boolean; text: string }

function splitByPhrasePattern(chunk: string, pattern: RegExp | null): HighlightSegment[] {
  if (!chunk) return []
  if (!pattern) return [{ emph: false, text: chunk }]

  const out: HighlightSegment[] = []
  let last = 0
  const re = new RegExp(pattern.source, 'giu')
  let m: RegExpExecArray | null
  while ((m = re.exec(chunk)) !== null) {
    if (m.index > last) out.push({ emph: false, text: chunk.slice(last, m.index) })
    out.push({ emph: true, text: m[0] })
    last = m.index + m[0].length
  }
  if (last < chunk.length) out.push({ emph: false, text: chunk.slice(last) })
  return out.length ? out : [{ emph: false, text: chunk }]
}

function buildPhrasePattern(phrases: string[]): RegExp | null {
  if (!phrases.length) return null
  const inner = phrases.map(escapeRegExp).join('|')
  try {
    return new RegExp(`(?<![\\p{L}\\p{N}_])(${inner})(?![\\p{L}\\p{N}_])`, 'giu')
  } catch {
    return new RegExp(`\\b(${inner})\\b`, 'gi')
  }
}

/**
 * Zerlegt Text in Segmente; `emph` = fett (Kontextphrase oder Zahlen/Währung).
 */
export function splitTextWithContextHighlights(
  text: string,
  phrases: string[],
  options?: { includeNumeric?: boolean }
): HighlightSegment[] {
  const includeNumeric = options?.includeNumeric !== false
  const phrasePattern = buildPhrasePattern(phrases)

  if (!includeNumeric) {
    return splitByPhrasePattern(text, phrasePattern)
  }

  const segments: HighlightSegment[] = []
  let lastIdx = 0
  const numRe = new RegExp(NUMERIC_HIGHLIGHT_RE.source, 'gi')
  let nm: RegExpExecArray | null
  while ((nm = numRe.exec(text)) !== null) {
    if (nm.index > lastIdx) {
      segments.push(...splitByPhrasePattern(text.slice(lastIdx, nm.index), phrasePattern))
    }
    segments.push({ emph: true, text: nm[0] })
    lastIdx = nm.index + nm[0].length
  }
  if (lastIdx < text.length) {
    segments.push(...splitByPhrasePattern(text.slice(lastIdx), phrasePattern))
  }
  return segments.length ? segments : [{ emph: false, text }]
}
