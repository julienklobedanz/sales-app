/** Workspace-Einstellung: Anzeige von Referenz-/Projektdaten. */
export type OrgDateDisplayFormat = 'de-DE' | 'en-US' | 'en-GB' | 'iso'

const ORG_DATE_FORMATS: readonly OrgDateDisplayFormat[] = [
  'de-DE',
  'en-US',
  'en-GB',
  'iso',
]

export function normalizeOrgDateDisplayFormat(
  raw: string | null | undefined,
): OrgDateDisplayFormat {
  const s = String(raw ?? '').trim()
  return ORG_DATE_FORMATS.includes(s as OrgDateDisplayFormat)
    ? (s as OrgDateDisplayFormat)
    : 'de-DE'
}

function calendarPartsFromValue(
  value: string,
): { y: number; m: number; d: number } | null {
  const raw = value.trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (dateOnly) {
    const y = Number(dateOnly[1])
    const m = Number(dateOnly[2])
    const d = Number(dateOnly[3])
    if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null
    return { y, m, d }
  }
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return null
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

/**
 * Formatiert ein Kalenderdatum (ISO-Datum oder Timestamp) für die UI — ohne toLocaleDateString (SSR-sicher).
 */
export function formatReferenceDate(
  value: string | null | undefined,
  preset: OrgDateDisplayFormat | null | undefined = 'de-DE',
): string {
  if (value == null || String(value).trim() === '') return ''
  const parts = calendarPartsFromValue(String(value))
  if (!parts) return String(value).trim()
  const { y, m, d } = parts
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const yyyy = String(y)
  const p = normalizeOrgDateDisplayFormat(preset ?? undefined)
  switch (p) {
    case 'iso':
      return `${yyyy}-${mm}-${dd}`
    case 'en-US':
      return `${mm}/${dd}/${yyyy}`
    case 'en-GB':
      return `${dd}/${mm}/${yyyy}`
    case 'de-DE':
    default:
      return `${dd}.${mm}.${yyyy}`
  }
}

/** @deprecated Nutze formatReferenceDate(value, 'de-DE') — bleibt für bestehende Aufrufe. */
export function formatDateUtcDe(iso: string) {
  return formatReferenceDate(iso, 'de-DE')
}

/** Tausender-Trennzeichen (de-DE: 5.000.000) */
export function formatNumberDe(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n =
    typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('de-DE')
}

/** Nur Ziffern → Tausenderpunkte (Eingabefelder, konsistent mit Referenz-Formular). */
export function formatThousandsDots(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Brandfetch liefert bei der höchsten Mitarbeiter-Kategorie oft 10.001 als Deckel — Anzeige als „10.001+“. */
export const BRANDFETCH_EMPLOYEE_CAP = 10_001

export function formatEmployeeCountDeDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  const n = Math.trunc(Number(value))
  if (n === BRANDFETCH_EMPLOYEE_CAP) return '10.001+'
  return formatThousandsDots(String(n))
}

/** Formular: „10.001+“ → gespeichert als 10.001 (Brandfetch-Obergrenze). */
export function parseGermanEmployeeCountInput(
  raw: string | null | undefined,
): number | null {
  const t = String(raw ?? '').trim()
  if (!t) return null
  if (/\+/.test(t)) return BRANDFETCH_EMPLOYEE_CAP
  return parseThousandsDotsToInt(t)
}

/** Aus Eingabe mit Tausenderpunkten eine ganze Zahl (oder null). */
export function parseThousandsDotsToInt(raw: string | null | undefined): number | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isNaN(n) ? null : n
}

const VOLUME_SYMBOL_BY_CODE: Record<string, string> = {
  AED: 'AED',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
  HKD: 'HK$',
  JPY: '¥',
  SGD: 'S$',
  USD: '$',
}

const VOLUME_CODE_BY_TOKEN: Record<string, string> = {
  AED: 'AED',
  AUD: 'AUD',
  CAD: 'CAD',
  CHF: 'CHF',
  CNY: 'CNY',
  EUR: 'EUR',
  GBP: 'GBP',
  HKD: 'HKD',
  JPY: 'JPY',
  SGD: 'SGD',
  USD: 'USD',
  A$: 'AUD',
  C$: 'CAD',
  HK$: 'HKD',
  S$: 'SGD',
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
  '¥': 'JPY',
}

export function parseReferenceVolume(value: string | null | undefined): {
  currencyCode: string
  amountDigits: string
} | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const tokenMatch = raw.match(
    /^(AED|AUD|CAD|CHF|CNY|EUR|GBP|HKD|JPY|SGD|USD|A\$|C\$|HK\$|S\$|€|\$|£|¥)(?:\s|$)/i,
  )
  const token = tokenMatch?.[1]?.toUpperCase() ?? ''
  const currencyCode = VOLUME_CODE_BY_TOKEN[token] ?? 'EUR'

  const amountDigits = raw.replace(/\D/g, '')
  if (!amountDigits) return null

  return { currencyCode, amountDigits }
}

export function formatReferenceVolume(value: string | null | undefined): string {
  const parsed = parseReferenceVolume(value)
  if (!parsed) return ''
  const symbol = VOLUME_SYMBOL_BY_CODE[parsed.currencyCode] ?? '€'
  return `${symbol} ${formatNumberDe(parsed.amountDigits)}`
}

function trimCompactDecimal(value: string): string {
  return value.replace(/\.0$/, '')
}

function formatCompactVolumeAmount(amount: number): string {
  const n = Math.abs(amount)
  if (n >= 1_000_000_000) {
    return `${trimCompactDecimal((n / 1_000_000_000).toFixed(1))}B`
  }
  if (n >= 1_000_000) {
    return `${trimCompactDecimal((n / 1_000_000).toFixed(1))}M`
  }
  if (n >= 1_000) {
    const thousands = n / 1_000
    if (thousands >= 100 || Number.isInteger(thousands)) {
      return `${Math.round(thousands)}k`
    }
    return `${trimCompactDecimal(thousands.toFixed(1))}k`
  }
  return String(Math.round(n))
}

/** Kompakte Darstellung für Tabellen (z. B. „€ 1.2M“, „€ 800k“). */
export function formatReferenceVolumeCompact(value: string | null | undefined): string {
  const parsed = parseReferenceVolume(value)
  if (!parsed) return ''
  const amount = Number(parsed.amountDigits)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  const symbol = VOLUME_SYMBOL_BY_CODE[parsed.currencyCode] ?? '€'
  return `${symbol} ${formatCompactVolumeAmount(amount)}`
}

/**
 * Deal-Volumen (`deals.volume`): Tausenderpunkte + Währung (de-DE, z. B. „1.500.000 €“).
 * Für Tabellen und Detailansichten — einheitlich statt Rohwert aus der DB.
 */
export function formatDealVolume(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '—'

  const parsed = parseReferenceVolume(raw)
  if (parsed) {
    const amount = formatNumberDe(parsed.amountDigits)
    const symbol = VOLUME_SYMBOL_BY_CODE[parsed.currencyCode] ?? '€'
    if (parsed.currencyCode === 'EUR') {
      return `${amount} €`
    }
    return `${symbol} ${amount}`.trim()
  }

  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw
  return `${formatNumberDe(digits)} €`
}

export function diffMonthsUtc(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  return Math.max(
    0,
    (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()),
  )
}
