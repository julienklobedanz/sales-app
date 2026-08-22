/** Jahr aus Projektende, sonst Projektstart — sichtbare Spalte und Default-Sort. */
export function projectYearFromDates(
  projectEnd: string | null | undefined,
  projectStart: string | null | undefined,
): number | null {
  const iso = String(projectEnd ?? '').trim() || String(projectStart ?? '').trim()
  if (!iso) return null
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return null
  return new Date(iso).getUTCFullYear()
}

function updatedAtTimestamp(updatedAt: string | null | undefined): number {
  if (!updatedAt) return 0
  const time = new Date(updatedAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

/** Default-Sort: Projektjahr desc, nulls last, `updated_at` nur Gleichstand. */
export function compareReferencesByProjectYearDesc<
  T extends {
    project_end?: string | null
    project_start?: string | null
    updated_at?: string | null
  },
>(a: T, b: T): number {
  const ya = projectYearFromDates(a.project_end, a.project_start)
  const yb = projectYearFromDates(b.project_end, b.project_start)
  if (ya == null && yb == null) {
    return updatedAtTimestamp(b.updated_at) - updatedAtTimestamp(a.updated_at)
  }
  if (ya == null) return 1
  if (yb == null) return -1
  if (ya !== yb) return yb - ya
  return updatedAtTimestamp(b.updated_at) - updatedAtTimestamp(a.updated_at)
}
