/**
 * Projektlaufzeit in Monaten — gleiche Logik wie in app/dashboard/references/dashboard.ts
 * (keine DB-Spalte `duration_months` auf `references`).
 */
export function computeReferenceDurationMonths(params: {
  project_start: string | null
  project_end: string | null
  project_status: string | null
}): number | null {
  const start = params.project_start
  const end = params.project_end
  const status = (params.project_status as 'active' | 'completed' | null) ?? null

  if (start && end) {
    const s = new Date(start)
    const e = new Date(end)
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      return Math.max(
        0,
        (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth())
      )
    }
  } else if (status === 'active' && start) {
    const s = new Date(start)
    const now = new Date()
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(now.getTime())) {
      return Math.max(
        0,
        (now.getUTCFullYear() - s.getUTCFullYear()) * 12 + (now.getUTCMonth() - s.getUTCMonth())
      )
    }
  }
  return null
}
