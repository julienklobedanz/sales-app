export type TimelineItemKind = 'qa' | 'submission' | 'start' | 'default'

export function getTimelineItemKind(title: string): TimelineItemKind {
  const t = title.toLowerCase()
  if (/q\s*&\s*a|rückfrage|fragefrist|questions|clarification/.test(t)) return 'qa'
  if (
    /angebotsabgabe|angebot.*abgabe|einreichung|submission|bid due|proposal due/.test(t)
  ) {
    return 'submission'
  }
  if (
    /projektstart|vertragsstart|vertrags-|servicebeginn|service-start|service\s*beginn|gewünschter\s+service|kickoff|contract start|go-live|projekt-start/.test(
      t,
    )
  ) {
    return 'start'
  }
  return 'default'
}

/**
 * Geplanter Service-/Projektstart: in Deal Deadlines anzeigen (Win-Voraussetzung),
 * aber nicht in den Kalender-Export — sonst blockiert Sales den Termin ohne gewonnenen Deal.
 */
export function isTimelineItemExcludedFromIcsExport(title: string): boolean {
  return getTimelineItemKind(title) === 'start'
}
