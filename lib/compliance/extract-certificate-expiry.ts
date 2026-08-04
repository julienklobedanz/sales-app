/**
 * Heuristik: Ablaufdatum aus Zertifikat-PDF-Text (DE/EN/FR/IT/ES/NL).
 * Liefert ISO-Datum YYYY-MM-DD oder null.
 */

const EXPIRY_CONTEXT_PATTERNS: RegExp[] = [
  /\bgu[eéü]ltig(?:keit)?\s+bis\b/gi,
  /\bgueltig(?:keit)?\s+bis\b/gi,
  /\bgültig(?:keit)?\s+bis\b/gi,
  /\bvalid\s+(?:until|thru|through|to)\b/gi,
  /\bvalidity\s+(?:until|through|to)\b/gi,
  /\bexpir(?:y|es|ation|ing)\b/gi,
  /\bexp(?:iry|ires)\s+date\b/gi,
  /\bdate\s+of\s+expir(?:y|ation)\b/gi,
  /\bablauf(?:datum|)\b/gi,
  /\bl[aä]uft\s+ab\b/gi,
  /\bcertificate\s+expires\b/gi,
  /\brenewal\s+date\b/gi,
  /\bvalable\s+jusqu['']?au\b/gi,
  /\bdate\s+d['']expiration\b/gi,
  /\bexpire\s+le\b/gi,
  /\bvalido\s+fino\s+al\b/gi,
  /\bscadenza\b/gi,
  /\bdata\s+di\s+scadenza\b/gi,
  /\bv[aá]lido\s+hasta\b/gi,
  /\bvencimiento\b/gi,
  /\bfecha\s+de\s+(?:caducidad|vencimiento)\b/gi,
  /\bgeldig\s+tot\b/gi,
  /\bvervaldatum\b/gi,
  /\beinddatum\b/gi,
  /\bg[uü]ltigkeitsdatum\b/gi,
]

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  januar: 1,
  february: 2,
  feb: 2,
  februar: 2,
  march: 3,
  mar: 3,
  märz: 3,
  maerz: 3,
  april: 4,
  apr: 4,
  may: 5,
  mai: 5,
  june: 6,
  jun: 6,
  juni: 6,
  july: 7,
  jul: 7,
  juli: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  oktober: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  dezember: 12,
  dez: 12,
}

export type ExtractedCertificateExpiry = {
  validUntil: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  source?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseDmy(parts: [number, number, number]): string | null {
  const [a, b, year] = parts
  let day: number
  let month: number
  if (a > 12) {
    day = a
    month = b
  } else if (b > 12) {
    day = b
    month = a
  } else {
    day = a
    month = b
  }
  return toIsoDate(year, month, day)
}

type ScoredDate = { iso: string; score: number; source: string }

function addScored(map: Map<string, ScoredDate>, candidate: ScoredDate) {
  const existing = map.get(candidate.iso)
  if (!existing || candidate.score > existing.score) {
    map.set(candidate.iso, candidate)
  }
}

function extractNumericDates(text: string, baseScore: number, source: string, scored: Map<string, ScoredDate>) {
  const dmy =
    /\b(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})\b/g
  for (const match of text.matchAll(dmy)) {
    const iso = parseDmy([Number(match[1]), Number(match[2]), Number(match[3])])
    if (iso) addScored(scored, { iso, score: baseScore, source })
  }

  const ymd = /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/g
  for (const match of text.matchAll(ymd)) {
    const iso = toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]))
    if (iso) addScored(scored, { iso, score: baseScore + 2, source })
  }

  const dmyShort =
    /\b(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{2})\b/g
  for (const match of text.matchAll(dmyShort)) {
    const yy = Number(match[3])
    const year = yy >= 70 ? 1900 + yy : 2000 + yy
    const iso = parseDmy([Number(match[1]), Number(match[2]), year])
    if (iso) addScored(scored, { iso, score: baseScore - 1, source })
  }
}

function extractMonthNameDates(text: string, baseScore: number, source: string, scored: Map<string, ScoredDate>) {
  const re =
    /\b(\d{1,2})[.\s]+([A-Za-zÀ-ÿ]+)[.\s]+(\d{4})\b/g
  for (const match of text.matchAll(re)) {
    const month = MONTH_NAMES[match[2].toLowerCase().replace(/\./g, '')]
    if (!month) continue
    const iso = toIsoDate(Number(match[3]), month, Number(match[1]))
    if (iso) addScored(scored, { iso, score: baseScore + 1, source })
  }

  const re2 =
    /\b([A-Za-zÀ-ÿ]+)[.\s]+(\d{1,2})[,.\s]+(\d{4})\b/g
  for (const match of text.matchAll(re2)) {
    const month = MONTH_NAMES[match[1].toLowerCase().replace(/\./g, '')]
    if (!month) continue
    const iso = toIsoDate(Number(match[3]), month, Number(match[2]))
    if (iso) addScored(scored, { iso, score: baseScore + 1, source })
  }
}

function scoreContextWindows(normalized: string): Array<{ start: number; end: number; score: number }> {
  const windows: Array<{ start: number; end: number; score: number }> = []
  for (const pattern of EXPIRY_CONTEXT_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalized)) !== null) {
      const start = match.index
      const end = Math.min(normalized.length, start + match[0].length + 120)
      windows.push({ start, end, score: 40 })
    }
  }
  return windows
}

export function extractCertificateExpiryFromText(
  rawText: string,
  refDate: Date = new Date()
): ExtractedCertificateExpiry {
  const normalized = String(rawText ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()

  if (!normalized) {
    return { validUntil: null, confidence: 'none' }
  }

  const windows = scoreContextWindows(normalized)
  const scored = new Map<string, ScoredDate>()

  extractNumericDates(normalized, 5, 'global', scored)
  extractMonthNameDates(normalized, 8, 'global', scored)

  for (const window of windows) {
    const slice = normalized.slice(window.start, window.end)
    extractNumericDates(slice, 5 + window.score, 'keyword', scored)
    extractMonthNameDates(slice, 8 + window.score, 'keyword', scored)
  }

  if (!scored.size) {
    return { validUntil: null, confidence: 'none' }
  }

  const today = new Date(refDate)
  today.setHours(0, 0, 0, 0)

  const ranked = [...scored.values()]
    .map((entry) => {
      const d = new Date(`${entry.iso}T12:00:00`)
      const daysFromNow = Math.round((d.getTime() - today.getTime()) / 86_400_000)
      let rank = entry.score
      if (daysFromNow >= 0 && daysFromNow <= 365 * 15) rank += 15
      if (daysFromNow < 0 && daysFromNow >= -365 * 3) rank += 5
      if (entry.source === 'keyword') rank += 10
      return { ...entry, rank, daysFromNow }
    })
    .sort((a, b) => b.rank - a.rank)

  const best = ranked[0]
  if (!best) return { validUntil: null, confidence: 'none' }

  const confidence: ExtractedCertificateExpiry['confidence'] =
    best.rank >= 50 ? 'high' : best.rank >= 35 ? 'medium' : best.rank >= 20 ? 'low' : 'none'

  if (confidence === 'none') {
    return { validUntil: null, confidence: 'none' }
  }

  return {
    validUntil: best.iso,
    confidence,
    source: best.source,
  }
}
