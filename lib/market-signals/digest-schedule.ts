/** Fenster in Minuten – muss zum Vercel-Cron passen (z. B. alle 10 Minuten). */
export const DIGEST_SEND_WINDOW_MINUTES = 10

export const DEFAULT_DIGEST_TIMEZONE = 'Europe/Berlin'
export const DEFAULT_DIGEST_LOCAL_TIME = '08:00'

/** Auswahl für Einstellungen (IANA). */
export const DIGEST_TIMEZONE_OPTIONS = [
  'Europe/Berlin',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Amsterdam',
  'Europe/Paris',
  'Europe/London',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Singapore',
  'Asia/Tokyo',
] as const

export function parseDigestLocalTime(raw: unknown): { hours: number; minutes: number } {
  const s = String(raw ?? DEFAULT_DIGEST_LOCAL_TIME).trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return { hours: 8, minutes: 0 }
  let h = parseInt(m[1], 10)
  let min = parseInt(m[2], 10)
  if (!Number.isFinite(h) || !Number.isFinite(min)) return { hours: 8, minutes: 0 }
  h = Math.max(0, Math.min(23, h))
  min = Math.max(0, Math.min(59, min))
  return { hours: h, minutes: min }
}

export function parseDigestTimezone(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return DEFAULT_DIGEST_TIMEZONE
  return s
}

export function getLocalYmdAndMinutesFromMidnight(utcDate: Date, timeZone: string): { ymd: string; minutes: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(utcDate)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '0'
  const y = get('year')
  const mo = get('month')
  const da = get('day')
  const hour = parseInt(get('hour'), 10)
  const minute = parseInt(get('minute'), 10)
  const ymd = `${y}-${mo}-${da}`
  const minutes = hour * 60 + minute
  return { ymd, minutes }
}

export function isDigestSendWindow(
  utcNow: Date,
  timeZone: string,
  digestHours: number,
  digestMinutes: number,
  windowMinutes: number
): boolean {
  const { minutes: nowMin } = getLocalYmdAndMinutesFromMidnight(utcNow, timeZone)
  const target = digestHours * 60 + digestMinutes
  return nowMin >= target && nowMin < target + windowMinutes
}
