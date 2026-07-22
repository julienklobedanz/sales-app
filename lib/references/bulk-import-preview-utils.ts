const PROJECT_PERIOD_LABEL =
  /^(?:projektzeitraum|zeitraum|projektlaufzeit|laufzeit|project\s*period|duration)\b/i

const DATE_RANGE_IN_LINE =
  /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*[–—-]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/

/** Projektname wirkt wie Zeitraum/Datum statt echter Titel — Nutzer soll prüfen. */
export function isSuspiciousBulkImportProjectName(name: string): boolean {
  const t = String(name ?? '').trim()
  if (!t) return false
  if (PROJECT_PERIOD_LABEL.test(t)) return true
  if (DATE_RANGE_IN_LINE.test(t) && t.length < 100) return true
  return false
}
