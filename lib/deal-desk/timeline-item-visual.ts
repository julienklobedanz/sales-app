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
