import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '').slice(0, 8)
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^\wäöüÄÖÜß.-]+/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'bid-fristen'
}

export function buildBidTimelineIcsContent(params: {
  customerName: string
  rfpTitle: string
  items: DealDeskTimelineItem[]
  projectId?: string
}): string {
  const { customerName, rfpTitle, items, projectId } = params
  const stamp = formatIcsStamp(new Date())
  const host = 'refstack-deal-desk'

  const events = items
    .filter((it) => typeof it.dueDate === 'string' && it.dueDate.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((it) => {
      const summary = `${customerName} | ${rfpTitle}: ${it.title}`
      const uid = `${projectId ?? 'project'}-${it.id}@${host}`
      const dtStart = toIcsDate(it.dueDate)
      const dtEnd = toIcsDate(addDaysIso(it.dueDate, 1))
      const description = it.evidence
        ? escapeIcsText(`Beleg: ${it.evidence}`)
        : escapeIcsText(`RFP-Frist aus Deal Desk — ${it.title}`)

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
      ].join('\r\n')
    })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RefStack//Deal Desk//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadBidTimelineIcs(params: {
  customerName: string
  rfpTitle: string
  items: DealDeskTimelineItem[]
  projectId?: string
}): void {
  const content = buildBidTimelineIcsContent(params)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFileName(params.rfpTitle)}-fristen.ics`
  anchor.click()
  URL.revokeObjectURL(url)
}
