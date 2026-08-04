import { normalizeDueTime } from '@/lib/deal-desk/timeline-display'
import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'

import {
  buildRfpDeadlineSourceKey,
  inferDeadlineKindFromTitle,
} from './deadline-source-key'
import type { DealDeadlineKind } from './deadline-types'

export type RfpDeadlineUpsertRow = {
  kind: DealDeadlineKind
  label: string
  due_at: string | null
  due_text: string | null
  is_approximate: boolean
  source_key: string
}

/** ISO-Timestamp für DB — Datum + optionale Uhrzeit (UTC-Mittag wenn ohne Zeit). */
export function timelineDueToIso(
  dueDate: string,
  dueTime?: string | null,
): string | null {
  if (!dueDate || dueDate.length < 10) return null
  const datePart = dueDate.slice(0, 10)
  const time = normalizeDueTime(dueTime ?? null)
  if (time) {
    return `${datePart}T${time}:00.000Z`
  }
  return `${datePart}T12:00:00.000Z`
}

export function mapTimelineItemToRfpDeadlineRow(
  dealId: string,
  item: DealDeskTimelineItem,
): RfpDeadlineUpsertRow | null {
  const label = item.title?.trim()
  if (!label) return null

  const kind = inferDeadlineKindFromTitle(label)
  const due_at = timelineDueToIso(item.dueDate, item.dueTime)

  if (!due_at) {
    return {
      kind,
      label,
      due_at: null,
      due_text: item.dueDate?.trim() || label,
      is_approximate: true,
      source_key: buildRfpDeadlineSourceKey(dealId, kind, label),
    }
  }

  return {
    kind,
    label,
    due_at,
    due_text: null,
    is_approximate: false,
    source_key: buildRfpDeadlineSourceKey(dealId, kind, label),
  }
}

export function mapTimelineToRfpDeadlineRows(
  dealId: string,
  items: DealDeskTimelineItem[],
): RfpDeadlineUpsertRow[] {
  const rows: RfpDeadlineUpsertRow[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const row = mapTimelineItemToRfpDeadlineRow(dealId, item)
    if (!row || seen.has(row.source_key)) continue
    seen.add(row.source_key)
    rows.push(row)
  }
  return rows
}
