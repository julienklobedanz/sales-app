import type { DealDeskTimelineItem } from '@/lib/deal-desk/deal-analysis-types'

const MS_DAY = 24 * 60 * 60 * 1000

/** Normalisiert Uhrzeiten aus KI/JSON auf HH:mm (24h) oder null. */
export function normalizeDueTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value
    .trim()
    .replace(/\s*uhr\s*$/i, '')
    .replace('.', ':')
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatDateDe(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function daysUntil(iso: string, now: Date): number {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setHours(0, 0, 0, 0)
  const nowNorm = new Date(now)
  nowNorm.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - nowNorm.getTime()) / MS_DAY)
}

export function formatCountdown(days: number): string {
  if (days < 0) return `(vor ${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'en'})`
  if (days === 0) return '(heute)'
  return `(in ${days} Tag${days === 1 ? '' : 'en'})`
}

/**
 * Anzeigeformat für Deal Deadlines, z. B.:
 * „12.06.2026 (in 13 Tagen) um 13:00 | Q&A / Rückfragenfrist“
 */
export function formatDealDeadlineLabel(
  item: Pick<DealDeskTimelineItem, 'dueDate' | 'dueTime' | 'title'>,
  now: Date = new Date(),
): string {
  const nowNorm = new Date(now)
  nowNorm.setHours(0, 0, 0, 0)
  const days = daysUntil(item.dueDate, nowNorm)
  const timeSuffix = item.dueTime ? ` um ${item.dueTime}` : ''
  return `${formatDateDe(item.dueDate)} ${formatCountdown(days)}${timeSuffix} | ${item.title}`
}
