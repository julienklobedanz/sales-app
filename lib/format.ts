/** Deterministisches Datumsformat (Server = Client), vermeidet Hydration-Fehler durch toLocaleDateString. */
export function formatDateUtcDe(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

/** Tausender-Trennzeichen (de-DE: 5.000.000) */
export function formatNumberDe(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('de-DE')
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
  'A$': 'AUD',
  'C$': 'CAD',
  'HK$': 'HKD',
  'S$': 'SGD',
  '€': 'EUR',
  '$': 'USD',
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
    /^(AED|AUD|CAD|CHF|CNY|EUR|GBP|HKD|JPY|SGD|USD|A\$|C\$|HK\$|S\$|€|\$|£|¥)(?:\s|$)/i
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

export function diffMonthsUtc(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  return Math.max(
    0,
    (e.getUTCFullYear() - s.getUTCFullYear()) * 12 +
      (e.getUTCMonth() - s.getUTCMonth())
  )
}

