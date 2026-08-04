/**
 * Einheitliches Limit für Zusammenfassung, Herausforderung und Lösung (Formular + Server).
 * Der PPTX-One-Pager (`reference-onepager-pptx`) skaliert die Schriftgröße, damit der
 * vollständige Text auf eine Folie passt — dieses Limit gilt für Formular/Import.
 */
export const REFERENCE_NARRATIVE_MAX_CHARS = 620

export function narrativeFieldLengthError(
  raw: string | null | undefined,
  fieldLabel: string,
): string | null {
  const len = raw == null ? 0 : String(raw).length
  if (len <= REFERENCE_NARRATIVE_MAX_CHARS) return null
  return `${fieldLabel}: höchstens ${REFERENCE_NARRATIVE_MAX_CHARS} Zeichen erlaubt (aktuell ${len}).`
}

/** Hartes Kürzen für KI-/Import-Pfade (kein Fehler). */
export function clampNarrativeText(raw: string | null | undefined): string {
  const s = String(raw ?? '')
  if (s.length <= REFERENCE_NARRATIVE_MAX_CHARS) return s
  return s.slice(0, REFERENCE_NARRATIVE_MAX_CHARS)
}

export function clampNarrativeTextNullable(
  raw: string | null | undefined,
): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const c = clampNarrativeText(s)
  return c.trim() ? c : null
}
