/** Min-/Max-Breiten für manuelles Spalten-Resize. */
export const TABLE_COLUMN_MIN_WIDTH = 72
export const TABLE_COLUMN_MAX_WIDTH = 640

export function clampColumnWidth(width: number, min = TABLE_COLUMN_MIN_WIDTH, max = TABLE_COLUMN_MAX_WIDTH) {
  return Math.min(max, Math.max(min, Math.round(width)))
}

export function loadColumnWidthsFromStorage(
  storageKey: string,
  allowedKeys: readonly string[],
): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const allowed = new Set(allowedKeys)
    const result: Record<string, number> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!allowed.has(key)) continue
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      result[key] = clampColumnWidth(value)
    }
    return result
  } catch {
    return {}
  }
}

export function saveColumnWidthsToStorage(storageKey: string, widths: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths))
  } catch {
    // Quota / private mode — ignore
  }
}
