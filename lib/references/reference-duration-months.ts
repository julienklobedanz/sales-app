/**
 * Projektlaufzeit in Monaten — gleiche Logik wie in app/(app)/references/dashboard.ts
 * (keine DB-Spalte `duration_months` auf `references`).
 */
export function computeReferenceDurationMonths(params: {
  project_start: string | null
  project_end: string | null
  project_status: string | null
}): number | null {
  const start = params.project_start != null ? String(params.project_start).trim() : ''
  const end = params.project_end != null ? String(params.project_end).trim() : ''
  const status = (params.project_status as 'active' | 'completed' | null) ?? null

  if (start && end) {
    const s = new Date(start)
    const e = new Date(end)
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      return Math.max(
        0,
        (e.getUTCFullYear() - s.getUTCFullYear()) * 12 +
          (e.getUTCMonth() - s.getUTCMonth()),
      )
    }
  } else if (status === 'active' && start) {
    const s = new Date(start)
    const now = new Date()
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(now.getTime())) {
      return Math.max(
        0,
        (now.getUTCFullYear() - s.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - s.getUTCMonth()),
      )
    }
  }
  return null
}

/** Projektende mit Laufzeit in Monaten (Sales), z. B. „31.12.2023 (14 Monate)“. Nur wenn `project_end` gesetzt ist. */
export function formatProjectEndWithDurationDe(params: {
  project_start: string | null
  project_end: string | null
  project_status: string | null
  formatEndDate: (endIso: string) => string
}): string {
  const end = params.project_end != null ? String(params.project_end).trim() : ''
  if (!end) return ''
  const formatted = params.formatEndDate(end)
  const months = computeReferenceDurationMonths({
    project_start: params.project_start,
    project_end: params.project_end,
    project_status: params.project_status,
  })
  if (months == null || months < 1) return formatted
  const unit = months === 1 ? 'Monat' : 'Monate'
  return `${formatted} (${months} ${unit})`
}
