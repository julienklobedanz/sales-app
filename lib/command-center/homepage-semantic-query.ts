import { MASTER_INDUSTRIES } from '@/lib/constants/industries'
import { parseReferenceVolume } from '@/lib/format'

const INDUSTRY_SEMANTIC_PATTERNS: Array<{ id: string; re: RegExp }> = [
  {
    id: 'fin',
    re: /finanz(sektor|dienstleistung|branche)?|bank(en|ing)?|versicherung|insurance|fintech/i,
  },
  { id: 'ret', re: /handel|retail|konsumgüter|e-?commerce|einzelhandel|cpg/i },
  { id: 'man', re: /automotive|industrie|fertigung|manufacturing|produktion/i },
  { id: 'tech', re: /software|saas|tech|telekom|cloud|cyber|it-?dienst/i },
  { id: 'media', re: /medien|marketing|unterhaltung|entertainment|werbung|publishing/i },
  { id: 'energy', re: /energie|utilities|versorgung|rohstoff|öl|gas|strom/i },
  {
    id: 'health',
    re: /pharma|life\s*science|gesundheits(wesen)?|medizin|chemie|biotech/i,
  },
  {
    id: 'pub',
    re: /öffentlich(er)?\s*sektor|behörde|verwaltung|bildung|education|government/i,
  },
  {
    id: 'log',
    re: /logistik|transport|aviation|luftfahrt|shipping|spedition|reise|gastgewerbe/i,
  },
  { id: 'cons', re: /beratung|consulting|professional\s+services|audit|advisory/i },
  { id: 'prop', re: /immobilien|bauwirtschaft|construction|real\s+estate|property/i },
  { id: 'other', re: /sonstige|other|misc/i },
]

export type VolumeQueryConstraint = {
  operator: 'gte' | 'lte'
  amountEur: number
}

function millionsToEur(value: string): number | null {
  const num = Number.parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.round(num * 1_000_000)
}

function digitsToEur(value: string): number | null {
  const digits = value.replace(/\./g, '').replace(/,/g, '')
  const n = Number.parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Extrahiert einen Euro-Betrag aus Freitext (z. B. „€2Mio“, „2 Millionen“, „2.500.000 €“). */
export function parseEuroAmountFromQuery(text: string): number | null {
  const q = text.trim()
  if (!q) return null

  const euroMio =
    q.match(/€\s*(\d+(?:[.,]\d+)?)\s*(?:mio\.?|million(?:en)?)\b/i) ??
    q.match(/€\s*(\d+(?:[.,]\d+)?)\s*m\b/i)
  if (euroMio) {
    const eur = millionsToEur(euroMio[1]!)
    if (eur != null) return eur
  }

  const mio =
    q.match(/(\d+(?:[.,]\d+)?)\s*(?:mio\.?|million(?:en)?)(?:\s*(?:€|eur|euro))?/i) ??
    q.match(/(\d+(?:[.,]\d+)?)\s*m\s*€/i)
  if (mio) {
    const eur = millionsToEur(mio[1]!)
    if (eur != null) return eur
  }

  const withEuroSuffix = q.match(/(\d[\d.,]*)\s*(?:€|eur|euro)(?:\b|$)/i)
  if (withEuroSuffix) {
    const eur = digitsToEur(withEuroSuffix[1]!)
    if (eur != null) return eur
  }

  const euroPrefix = q.match(/€\s*(\d[\d.,]*)/i)
  if (euroPrefix) {
    const eur = digitsToEur(euroPrefix[1]!)
    if (eur != null) return eur
  }

  return null
}

/** Erkennt Volumen-Vergleiche wie „über 2 Millionen“, „>€2Mio“, „unter 500k“. */
export function parseVolumeConstraintFromQuery(
  raw: string,
): VolumeQueryConstraint | null {
  const q = raw.trim()
  if (!q) return null

  const amountEur = parseEuroAmountFromQuery(q)
  if (amountEur == null) return null

  const hasMin =
    /(?:über|ueber|mindestens|mehr\s+als|größer\s+als|groesser\s+als)/i.test(q) ||
    /\bab\b/i.test(q) ||
    /(?:^|[^\d])>\s*=?\s*(?:€|\d)/i.test(q)

  const hasMax =
    /(?:unter|weniger\s+als|kleiner\s+als|höchstens|hoechstens|maximal)/i.test(q) ||
    /(?:^|[^\d])<\s*=?\s*(?:€|\d)/i.test(q)

  if (hasMin && !hasMax) {
    return { operator: 'gte', amountEur }
  }
  if (hasMax && !hasMin) {
    return { operator: 'lte', amountEur }
  }

  return null
}

export function referenceVolumeMatchesConstraint(
  volumeEur: string | null | undefined,
  constraint: VolumeQueryConstraint,
): boolean {
  const parsed = parseReferenceVolume(volumeEur)
  if (!parsed) return false
  const amount = Number.parseInt(parsed.amountDigits, 10)
  if (!Number.isFinite(amount) || amount <= 0) return false

  if (constraint.operator === 'gte') {
    return amount >= constraint.amountEur
  }
  return amount <= constraint.amountEur
}

/**
 * Kurze Anreicherung vor dem Embedding — verbessert Volumen- und Branchen-Treffer.
 */
export function enrichHomepageSemanticQuery(raw: string): string {
  const q = raw.trim()
  if (!q) return q

  const hints: string[] = []
  const constraint = parseVolumeConstraintFromQuery(q)
  const amountEur = parseEuroAmountFromQuery(q)

  if (constraint) {
    if (constraint.operator === 'gte') {
      hints.push(`Volumen mindestens ${constraint.amountEur} EUR`)
      hints.push(
        `Projektvolumen größer oder gleich ${(constraint.amountEur / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Millionen Euro`,
      )
    } else {
      hints.push(`Volumen höchstens ${constraint.amountEur} EUR`)
      hints.push(
        `Projektvolumen kleiner oder gleich ${(constraint.amountEur / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Millionen Euro`,
      )
    }
  } else if (amountEur != null) {
    const mio = amountEur / 1_000_000
    if (mio >= 1) {
      hints.push(`Volumen: ${amountEur} EUR`)
      hints.push(
        `Projektvolumen circa ${mio.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Millionen Euro`,
      )
    } else {
      hints.push(`Volumen: ${amountEur} EUR`)
    }
  }

  for (const { id, re } of INDUSTRY_SEMANTIC_PATTERNS) {
    if (!re.test(q)) continue
    const item = MASTER_INDUSTRIES.find((entry) => entry.id === id)
    if (item) hints.push(`Branche: ${item.labelDe}`)
  }

  if (/zero\s*trust|siem|security|compliance|audit/i.test(q)) {
    hints.push('Security-Hardening, Zero Trust, Compliance und Audit-Anforderungen')
  }

  if (!hints.length) return q
  return `${q}\n\n${hints.join('\n')}`
}
