const PROJECT_PERIOD_LABEL =
  /^(?:projektzeitraum|zeitraum|projektlaufzeit|laufzeit|project\s*period|duration)\b/i

const DATE_RANGE_IN_LINE =
  /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*[–—-]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/

/**
 * Entfernt typische PDF-Artefakte am Titelanfang.
 * Häufiger Fall: Zeilenumbruch mitten in „References“ → erkannte Zeile beginnt mit „es …“.
 */
export function sanitizeExtractedProjectTitle(
  title: string | null | undefined,
): string | null {
  const t = String(title ?? '').trim()
  if (!t) return null

  let cleaned = t
  cleaned = cleaned.replace(/^es\s+(?=[A-Z0-9ÄÖÜ„"'])/u, '')
  cleaned = cleaned.replace(/^en\s+(?=[A-Z0-9ÄÖÜ„"'])/u, '')

  cleaned = cleaned.trim()
  return cleaned || null
}

/** Projektname wirkt wie Zeitraum/Datum statt echter Titel — Nutzer soll prüfen. */
export function isSuspiciousBulkImportProjectName(name: string): boolean {
  const t = String(name ?? '').trim()
  if (!t) return false
  if (PROJECT_PERIOD_LABEL.test(t)) return true
  if (DATE_RANGE_IN_LINE.test(t) && t.length < 100) return true
  return false
}
