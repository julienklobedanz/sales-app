/**
 * Extrahiert strukturelle Smart-Match-Constraints aus Freitext
 * (Volumen, Branche, Aktualität), damit Filter + SQL-Vorfilter greifen.
 */

import { MASTER_INDUSTRIES } from '@/lib/constants/industries'

export type ParsedSmartMatchConstraints = {
  /** Mindestvolumen in Euro; null = in Query nicht erkannt. */
  minVolume: number | null
  /** Master-Industry-Id; null = nicht erkannt. */
  industryId: string | null
  /**
   * Aktualität: positive Monate = „letzte N Monate“,
   * negativ = „älter als |N| Monate“ (z. B. -36).
   * null = nicht erkannt.
   */
  monthsBack: number | null
  /** Kalenderjahre (Ankerdatum), die ausgeschlossen werden sollen (z. B. 2026). */
  excludeYears: number[]
  /** Branchen-Ids die ausgeschlossen werden („kein Banking“, „ohne Healthcare“). */
  excludeIndustryIds: string[]
  /** Freitext-Negationen („ohne Cloud“, „kein SAP“). */
  excludeTerms: string[]
  found: {
    volume: boolean
    industry: boolean
    recency: boolean
    excludeYears: boolean
    excludeIndustries: boolean
    excludeTerms: boolean
  }
}

const VOLUME_SNAP = [1_000_000, 2_000_000, 5_000_000, 10_000_000] as const

/** Synonyme / Fragmente → Master-Industry-Id (längere Treffer zuerst prüfen). */
const INDUSTRY_ALIASES: { id: string; needles: string[] }[] = [
  {
    id: 'fin',
    needles: [
      'finanzdienstleistungsunternehmen',
      'finanzdienstleistungen',
      'finanzdienstleister',
      'financial services',
      'versicherung',
      'insurance',
      'banking',
      'banken',
      'bank',
      'finanz',
    ],
  },
  {
    id: 'man',
    needles: [
      'industrieunternehmen',
      'automotive',
      'fertigung',
      'manufacturing',
      'industrie',
      'produktion',
    ],
  },
  {
    id: 'tech',
    needles: [
      'telekommunikation',
      'software',
      'telecom',
      'it-unternehmen',
      'technologie',
      'tech',
    ],
  },
  {
    id: 'health',
    needles: [
      'life sciences',
      'gesundheitswesen',
      'healthcare',
      'pharma',
      'medizin',
      'chemie',
    ],
  },
  {
    id: 'energy',
    needles: ['versorgung', 'utilities', 'energie', 'rohstoffe', 'utilities'],
  },
  {
    id: 'ret',
    needles: ['konsumgüter', 'consumer', 'handel', 'retail', 'cpg'],
  },
  {
    id: 'log',
    needles: ['aviation', 'logistik', 'transport', 'spedtion', 'luftfahrt'],
  },
  {
    id: 'pub',
    needles: ['öffentlicher sektor', 'public sector', 'behörde', 'bildung', 'verwaltung'],
  },
  {
    id: 'cons',
    needles: ['professional services', 'beratung', 'consulting'],
  },
  {
    id: 'prop',
    needles: ['immobilien', 'bauwirtschaft', 'real estate', 'construction'],
  },
  {
    id: 'media',
    needles: ['unterhaltung', 'marketing', 'medien', 'media'],
  },
]

function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/€/g, ' eur ')
    .replace(/mios?\b/g, 'mio')
    .replace(/millionen\b/g, 'mio')
    .replace(/millions?\b/g, 'mio')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNumberToken(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  if (t.includes(',') && t.includes('.')) {
    // 1.234,5 → 1234.5
    const n = Number.parseFloat(t.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  if (t.includes(',')) {
    const n = Number.parseFloat(t.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  // 1.5 or 1.500.000 — if more than one dot, DE thousands
  const dots = (t.match(/\./g) ?? []).length
  if (dots > 1) {
    const n = Number.parseFloat(t.replace(/\./g, ''))
    return Number.isFinite(n) ? n : null
  }
  const n = Number.parseFloat(t)
  return Number.isFinite(n) ? n : null
}

/**
 * Snap auf bekannte Filter-Stufen (≥1/2/5/10 Mio).
 * Aufrunden auf die nächste Stufe, die den Mindestwunsch abdeckt.
 */
export function snapMinVolumeEur(euros: number): number {
  if (!Number.isFinite(euros) || euros <= 0) return euros
  for (const step of VOLUME_SNAP) {
    if (Math.abs(euros - step) / step <= 0.05) return step
  }
  const ceil = VOLUME_SNAP.find((s) => s >= euros)
  return ceil ?? Math.round(euros)
}

function amountToEuros(amount: number, unit: string | undefined): number {
  const u = (unit ?? '').toLowerCase()
  if (u === 'mio' || u === 'm' || u === 'million' || u === 'millionen') {
    return amount * 1_000_000
  }
  // Keine Einheit: kleine Zahlen bei „>“ als Mio lesen (">5" → 5 Mio)
  if (!u && amount > 0 && amount < 1000) {
    return amount * 1_000_000
  }
  return amount
}

export function parseMinVolumeFromQuery(query: string): number | null {
  const q = normalizeQuery(query)

  const patterns: RegExp[] = [
    // >5m, >= 5 mio, über 5 mio eur, ab 5 mio, mind. 5 mio
    /(?:^|[^\w])(?:>|≥|>=|ueber|über|mind(?:estens|\.)?|ab)\s*(?:eur\s*)?(\d+(?:[.,]\d+)?)\s*(mio|m|million|millionen)?\b/,
    // eur >5m / €>5 Mio
    /(?:eur)\s*(?:>|≥|>=)\s*(\d+(?:[.,]\d+)?)\s*(mio|m|million|millionen)?\b/,
    // 5 mio+, 5 mio und mehr, 5m>
    /(\d+(?:[.,]\d+)?)\s*(mio|m|million|millionen)\s*(?:\+|und mehr|>|≥)/,
    // > €5m / >€ 5 mio
    /(?:>|≥|>=)\s*eur\s*(\d+(?:[.,]\d+)?)\s*(mio|m|million|millionen)?\b/,
  ]

  for (const re of patterns) {
    const m = q.match(re)
    if (!m?.[1]) continue
    const amount = parseNumberToken(m[1])
    if (amount == null) continue
    const euros = amountToEuros(amount, m[2])
    if (euros > 0) return snapMinVolumeEur(euros)
  }

  return null
}

export function parseIndustryFromQuery(query: string): string | null {
  const q = normalizeQuery(query)

  // Längere Needles zuerst (pro Alias-Liste schon so sortiert)
  let best: { id: string; len: number } | null = null
  for (const row of INDUSTRY_ALIASES) {
    for (const needle of row.needles) {
      if (q.includes(needle) && (!best || needle.length > best.len)) {
        best = { id: row.id, len: needle.length }
      }
    }
  }
  if (best && MASTER_INDUSTRIES.some((i) => i.id === best!.id)) return best.id

  // Exakter Label-Match (kurz)
  for (const ind of MASTER_INDUSTRIES) {
    const de = ind.labelDe.toLowerCase()
    if (q.includes(de)) return ind.id
    const head = de.split(/[&,]/)[0]?.trim()
    if (head && head.length >= 5 && q.includes(head)) return ind.id
  }

  return null
}

/** Snap positive „letzte N Monate“ auf die UI-Stufen 12/24/36. */
function snapRecentMonths(n: number): number {
  if (n <= 12) return 12
  if (n <= 24) return 24
  return 36
}

export function parseRecencyFromQuery(query: string): number | null {
  const q = normalizeQuery(query)

  // älter / older than N Jahre|Monate (beliebige N, z. B. „älter als 1 Jahr“)
  const older = q.match(
    /(?:aelter|älter|older)\s+als\s+(\d{1,2})\s*(jahre?|years?|monate|mons?|months?)?/,
  )
  if (older?.[1]) {
    const n = Number.parseInt(older[1], 10)
    if (Number.isFinite(n) && n > 0) {
      const unit = older[2] ?? ''
      if (/^jahre?$|^years?$/.test(unit) || (!unit && n <= 10)) {
        // „älter als 1“ / „älter als 1 Jahr“ → Monate negativ
        return -(n * 12)
      }
      return -n
    }
  }

  // older than N year(s)|month(s)
  const olderEn = q.match(/older\s+than\s+(\d{1,2})\s*(years?|months?)?/)
  if (olderEn?.[1]) {
    const n = Number.parseInt(olderEn[1], 10)
    if (Number.isFinite(n) && n > 0) {
      const unit = olderEn[2] ?? ''
      if (/^years?$/.test(unit) || (!unit && n <= 10)) return -(n * 12)
      return -n
    }
  }

  const lastMonths = q.match(
    /(?:letzte[nrs]?|letzten|vergangene[nrs]?|past|last)\s*(\d{1,2})\s*(?:monate|mons?|months?)/,
  )
  if (lastMonths?.[1]) {
    const n = Number.parseInt(lastMonths[1], 10)
    if (Number.isFinite(n) && n > 0) return snapRecentMonths(n)
  }

  const lastYears = q.match(
    /(?:letzte[nrs]?|letzten|vergangene[nrs]?|past|last)\s*(\d{1,2})\s*(?:jahre?|years?)/,
  )
  if (lastYears?.[1]) {
    const n = Number.parseInt(lastYears[1], 10)
    if (Number.isFinite(n) && n > 0) return snapRecentMonths(n * 12)
  }

  // „24 monate“ ohne „letzte“ nur wenn klar zeitlich
  const bare = q.match(/\b(12|24|36)\s*(?:monate|mons?|months?)\b/)
  if (bare?.[1] && /(?:letzte|aktualit|zeitraum|seit)/.test(q)) {
    return Number.parseInt(bare[1], 10)
  }

  return null
}

/**
 * Kalenderjahre ausschließen: „nicht in 2026“, „Deals ohne 2025“, „außer 2024“, …
 */
export function parseExcludeYearsFromQuery(query: string): number[] {
  const q = normalizeQuery(query)
  const years = new Set<number>()

  const patterns: RegExp[] = [
    /(?:nicht|ohne|ausser|außer|exclude|excluding)\s+(?:in\s+)?(?:dem\s+)?(?:jahr\s+)?(20\d{2})\b/g,
    /(?:not\s+in|except(?:\s+for)?|excluding)\s+(20\d{2})\b/g,
    /(?:deals?|referenzen?|projekte?)\s+(?:nicht|ohne)\s+in\s+(20\d{2})\b/g,
  ]

  for (const re of patterns) {
    for (const m of q.matchAll(re)) {
      const y = Number.parseInt(m[1] ?? '', 10)
      if (y >= 2000 && y <= 2100) years.add(y)
    }
  }

  return [...years].sort((a, b) => a - b)
}

/** Branchen-Negationen: „kein Banking“, „ohne Healthcare“, „nicht Finanz…“. */
function parseExcludeIndustriesFromQuery(query: string): string[] {
  const q = normalizeQuery(query)
  const ids = new Set<string>()

  for (const fragment of negationFragments(q)) {
    if (/^(in\s+)?20\d{2}/.test(fragment)) continue
    if (/^(als|jahr|jahre|monat|monate)/.test(fragment)) continue
    const id = parseIndustryFromQuery(fragment)
    if (id) ids.add(id)
  }

  return [...ids]
}

/**
 * Freitext-Negationen die keine Branche sind („ohne Cloud“, „kein SAP“).
 * Branchen-Treffer werden hier bewusst weggelassen.
 */
function parseExcludeTermsFromQuery(query: string): string[] {
  const q = normalizeQuery(query)
  const terms = new Set<string>()
  const industryIds = new Set(parseExcludeIndustriesFromQuery(query))

  for (const fragment of negationFragments(q)) {
    if (/^(in\s+)?20\d{2}/.test(fragment)) continue
    if (/^(als|jahr|jahre|monat|monate)/.test(fragment)) continue
    const asIndustry = parseIndustryFromQuery(fragment)
    if (asIndustry && industryIds.has(asIndustry)) continue
    // Stopwords / Filter-Fragmente
    if (
      /^(mio|eur|euro|referenz|deal|projekt|branche|volumen|letzte|aelter|älter)/.test(
        fragment,
      )
    ) {
      continue
    }
    const token = fragment.split(/\s+/).slice(0, 3).join(' ')
    if (token.length >= 2) terms.add(token)
  }

  return [...terms]
}

/** Fragmente hinter Negationswörtern; stoppt vor der nächsten Negation. */
function negationFragments(q: string): string[] {
  const out: string[] = []
  const re =
    /(?:kein|keine|keinen|ohne|nicht|not|no)\s+(.+?)(?=\s+(?:kein|keine|keinen|ohne|nicht|not|no)\b|$)/g
  for (const m of q.matchAll(re)) {
    const fragment = (m[1] ?? '')
      .replace(/[.,;:!?].*$/, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ')
    if (fragment && !/^\d{4}$/.test(fragment)) out.push(fragment)
  }
  return out
}

export function parseSmartMatchQuery(query: string): ParsedSmartMatchConstraints {
  const minVolume = parseMinVolumeFromQuery(query)
  const industryId = parseIndustryFromQuery(query)
  const monthsBack = parseRecencyFromQuery(query)
  const excludeYears = parseExcludeYearsFromQuery(query)
  const excludeIndustryIds = parseExcludeIndustriesFromQuery(query)
  const excludeTerms = parseExcludeTermsFromQuery(query)
  // Positive Branche nicht setzen, wenn dieselbe Branche ausgeschlossen wird
  const positiveIndustry =
    industryId && !excludeIndustryIds.includes(industryId) ? industryId : null
  return {
    minVolume,
    industryId: positiveIndustry,
    monthsBack,
    excludeYears,
    excludeIndustryIds,
    excludeTerms,
    found: {
      volume: minVolume != null,
      industry: positiveIndustry != null,
      recency: monthsBack != null,
      excludeYears: excludeYears.length > 0,
      excludeIndustries: excludeIndustryIds.length > 0,
      excludeTerms: excludeTerms.length > 0,
    },
  }
}

/** Robuster Volumen-Parser für gespeicherte `volume_eur`-Strings. */
export function parseStoredVolumeEur(raw: unknown): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const q = normalizeQuery(raw)
  const withMio = q.match(/(\d+(?:[.,]\d+)?)\s*(mio|m|million|millionen)\b/)
  if (withMio?.[1]) {
    const amount = parseNumberToken(withMio[1])
    if (amount != null) return amountToEuros(amount, withMio[2])
  }
  // Nur Ziffern / DE-Tausender
  const digits = q.replace(/[^\d.,]/g, '')
  if (!digits) return null
  const n = parseNumberToken(digits)
  return n != null && n > 0 ? n : null
}
