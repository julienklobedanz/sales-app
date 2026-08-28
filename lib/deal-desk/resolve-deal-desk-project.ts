/**
 * Welches Deal-Desk-Projekt gehört zum Deal.
 *
 * `deal_desk_projects` ist nicht 1:1. Ohne eine Regel liefern Aufrufer
 * verschiedene Zeilen für dieselbe Frage.
 *
 * Aktiv (`archived_at IS NULL`), das zuletzt geänderte (`updated_at` desc).
 * `analysis_status = 'completed'` ist kein Teil dieser Frage — das ist ein
 * Anzeigefilter beim Cockpit („letzte fertige Analyse").
 */
export type DealDeskProjectPickRow = {
  archived_at: string | null
  updated_at: string
}

export function resolveDealDeskProject<T extends DealDeskProjectPickRow>(
  rows: readonly T[],
): T | null {
  let latest: T | null = null
  for (const row of rows) {
    if (row.archived_at != null) continue
    if (!latest || row.updated_at > latest.updated_at) latest = row
  }
  return latest
}
