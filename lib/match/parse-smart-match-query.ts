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
  found: {
    volume: boolean
    industry: boolean
    recency: boolean
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

export function parseRecencyFromQuery(query: string): number | null {
  const q = normalizeQuery(query)

  // älter als 36 monate / älter als 3 jahre
  if (
    /(?:aelter|älter)\s+als\s+36\s*(?:monate|mons?|months?)?/.test(q) ||
    /(?:aelter|älter)\s+als\s+3\s*jahre?/.test(q)
  ) {
    return -36
  }

  const last = q.match(
    /(?:letzte[nrs]?|letzten|vergangene[nrs]?|past|last)\s*(\d{1,2})\s*(?:monate|mons?|months?)/
  )
  if (last?.[1]) {
    const n = Number.parseInt(last[1], 10)
    if (n === 12 || n === 24 || n === 36) return n
    if (n > 0 && n <= 12) return 12
    if (n > 12 && n <= 24) return 24
    if (n > 24) return 36
  }

  // „24 monate“ ohne „letzte“ nur wenn klar zeitlich
  const bare = q.match(/\b(12|24|36)\s*(?:monate|mons?|months?)\b/)
  if (bare?.[1] && /(?:letzte|aktualit|zeitraum|seit)/.test(q)) {
    return Number.parseInt(bare[1], 10)
  }

  return null
}

export function parseSmartMatchQuery(query: string): ParsedSmartMatchConstraints {
  const minVolume = parseMinVolumeFromQuery(query)
  const industryId = parseIndustryFromQuery(query)
  const monthsBack = parseRecencyFromQuery(query)
  return {
    minVolume,
    industryId,
    monthsBack,
    found: {
      volume: minVolume != null,
      industry: industryId != null,
      recency: monthsBack != null,
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
