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

