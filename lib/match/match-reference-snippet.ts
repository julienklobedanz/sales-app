import 'server-only'

/** Kurztext für Karten (aus Summary gekürzt). */
export function snippetFromSummary(summary: string | null, title: string): string {
  const base = summary?.trim() || title?.trim() || ''
  if (base.length <= 220) return base
  return `${base.slice(0, 217)}…`
}
