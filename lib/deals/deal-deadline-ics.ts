import type { DealDeadlineRow } from '@/lib/deals/deadline-display'

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
    .slice(0, 80) || 'deal-termine'
}

export function dealDeadlinesExportableForIcs(deadlines: DealDeadlineRow[]): DealDeadlineRow[] {
  return deadlines
    .filter((d) => !d.suppressed_at && d.due_at && d.due_at.length >= 10)
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
}

export function buildDealDeadlinesIcsContent(params: {
  dealTitle: string
  dealId: string
  deadlines: DealDeadlineRow[]
}): string {
  const { dealTitle, dealId, deadlines } = params
  const stamp = formatIcsStamp(new Date())
  const host = 'refstack-deals'

  const events = dealDeadlinesExportableForIcs(deadlines).map((d) => {
    const iso = d.due_at!.slice(0, 10)
    const summary = `${dealTitle}: ${d.label}`
    const uid = `${dealId}-${d.id}@${host}`
    const dtStart = toIcsDate(iso)
    const dtEnd = toIcsDate(addDaysIso(iso, 1))
    const sourceNote = d.source === 'rfp' ? 'Quelle: RFP-Analyse. ' : ''
    const approxNote = d.is_approximate ? 'Datum ist als ungefähr markiert. ' : ''
    const description = escapeIcsText(`${sourceNote}${approxNote}${d.label}`.trim())

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
    'PRODID:-//RefStack//Deal Cockpit//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadDealDeadlinesIcs(params: {
  dealTitle: string
  dealId: string
  deadlines: DealDeadlineRow[]
}): void {
  const content = buildDealDeadlinesIcsContent(params)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFileName(params.dealTitle)}-termine.ics`
  anchor.click()
  URL.revokeObjectURL(url)
}
