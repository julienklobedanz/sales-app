/**
 * Welche `evidence_events` in der Deal-Aktivitäts-Timeline sichtbar sind.
 * Analytics-Typen (z. B. `reference_matched`) bleiben in der DB für Insights/Home-KPIs.
 */
export const DEAL_ACTIVITY_VISIBLE_EVENT_TYPES = [
  'deal_won',
  'deal_lost',
  'deal_withdrawn',
  'reference_helped',
] as const

export type DealActivityVisibleEventType =
  (typeof DEAL_ACTIVITY_VISIBLE_EVENT_TYPES)[number]

export type DealActivityEvidenceRow = {
  id: string
  event_type: string
  payload: { helped?: boolean; comment?: unknown } | null
  created_at: string
}

export type DealActivityMappedItem = {
  id: string
  at: Date
  title: string
  detail: string
}

export function isDealActivityVisibleEventType(
  eventType: string,
): eventType is DealActivityVisibleEventType {
  return (DEAL_ACTIVITY_VISIBLE_EVENT_TYPES as readonly string[]).includes(eventType)
}

export function dealActivityTitleForEvent(
  eventType: string,
  payload: DealActivityEvidenceRow['payload'],
): string {
  if (eventType === 'reference_helped') {
    return payload?.helped ? 'Referenz hat geholfen' : 'Referenz hat nicht geholfen'
  }
  if (eventType === 'deal_won') return 'Deal gewonnen'
  if (eventType === 'deal_lost') return 'Deal verloren'
  if (eventType === 'deal_withdrawn') return 'Deal zurückgezogen'
  return eventType
}

export function mapEvidenceEventsToDealActivities(
  events: DealActivityEvidenceRow[],
): DealActivityMappedItem[] {
  return events
    .filter((e) => isDealActivityVisibleEventType(e.event_type))
    .map((e) => ({
      id: String(e.id),
      at: new Date(String(e.created_at)),
      title: dealActivityTitleForEvent(e.event_type, e.payload),
      detail: e.payload?.comment ? String(e.payload.comment) : '',
    }))
}

/** Timeline: neueste Einträge oben, älteste unten. */
export function sortDealActivitiesNewestFirst(
  items: DealActivityMappedItem[],
): DealActivityMappedItem[] {
  return [...items].sort((a, b) => b.at.getTime() - a.at.getTime())
}
