import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, Clock, MessageSquare } from 'lucide-react'

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

type TimelineVisual = {
  Icon: LucideIcon
  iconClass: string
  wrapClass: string
  countdownClass?: string
}

const VISUALS: Record<TimelineItemKind, TimelineVisual> = {
  qa: {
    Icon: MessageSquare,
    iconClass: 'text-blue-500',
    wrapClass: 'bg-blue-50',
  },
  submission: {
    Icon: AlertTriangle,
    iconClass: 'text-red-600',
    wrapClass: 'bg-red-50',
    countdownClass: 'text-red-600/90',
  },
  start: {
    Icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    wrapClass: 'bg-emerald-50',
  },
  default: {
    Icon: Clock,
    iconClass: 'text-muted-foreground',
    wrapClass: 'bg-muted',
  },
}

export function getTimelineItemVisual(
  title: string,
): TimelineVisual & { kind: TimelineItemKind } {
  const kind = getTimelineItemKind(title)
  return { kind, ...VISUALS[kind] }
}
