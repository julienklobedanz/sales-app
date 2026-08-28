import { daysUntil, formatCountdown } from '@/lib/deal-desk/timeline-display'
import { formatReferenceDate, type OrgDateDisplayFormat } from '@/lib/format'

export type DealDeadlineRow = {
  id: string
  deal_id: string | null
  tender_id: string | null
  organization_id: string
  kind: string
  label: string
  due_at: string | null
  due_text: string | null
  is_approximate: boolean
  source: 'rfp' | 'manual'
  source_key: string
  suppressed_at: string | null
  pinned: boolean
  is_submission_target: boolean
  created_at: string
  updated_at: string
}

export function isTenderOwnedDeadline(
  row: Pick<DealDeadlineRow, 'deal_id' | 'tender_id'>,
): boolean {
  return row.tender_id != null && row.deal_id == null
}

/** Inherited Fristen bleiben an der Ausschreibung; dort gibt es den Toggle. */
export function canMarkDeadlineAsSubmissionTarget(
  ownerKind: 'deal' | 'tender',
  deadline: Pick<DealDeadlineRow, 'deal_id' | 'tender_id'>,
): boolean {
  return !(ownerKind === 'deal' && isTenderOwnedDeadline(deadline))
}

export function sortDeadlinesByDueAt(deadlines: DealDeadlineRow[]): DealDeadlineRow[] {
  return [...deadlines].sort((a, b) => {
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
    if (a.due_at) return -1
    if (b.due_at) return 1
    return a.label.localeCompare(b.label)
  })
}

export function mergeLotAndTenderDeadlines(
  lotDeadlines: DealDeadlineRow[],
  tenderDeadlines: DealDeadlineRow[],
): DealDeadlineRow[] {
  return sortDeadlinesByDueAt([...lotDeadlines, ...tenderDeadlines])
}

/** Kalendertag aus `due_at`. */
export function dueAtToDateIso(dueAt: string): string {
  // Gültig, weil timelineDueToIso Ortszeit als UTC schreibt (ohne Uhrzeit: T12:00Z).
  // Ein echter Offset im Feld — Import, Kalender-Sync — würde hier den Vortag liefern.
  return dueAt.slice(0, 10)
}

export function deadlineDaysUntil(
  deadline: Pick<DealDeadlineRow, 'due_at'>,
  now = new Date(),
): number | null {
  if (!deadline.due_at) return null
  return daysUntil(dueAtToDateIso(deadline.due_at), now)
}

function formatDeadlineDate(
  iso: string,
  dateDisplayFormat: OrgDateDisplayFormat = 'de-DE',
): string {
  return formatReferenceDate(iso, dateDisplayFormat)
}

export function formatDeadlineRowParts(
  deadline: Pick<DealDeadlineRow, 'due_at' | 'due_text' | 'is_approximate' | 'label'>,
  options?: { now?: Date; dateDisplayFormat?: OrgDateDisplayFormat },
): { labelDate: string; countdown: string | null } {
  const now = options?.now ?? new Date()
  const dateDisplayFormat = options?.dateDisplayFormat ?? 'de-DE'

  if (deadline.due_at) {
    const iso = dueAtToDateIso(deadline.due_at)
    const d = deadlineDaysUntil({ due_at: deadline.due_at }, now)
    const dateLabel = formatDeadlineDate(iso, dateDisplayFormat)
    return {
      labelDate: `${deadline.label} · ${dateLabel}`,
      countdown: d === null ? null : formatCountdown(d),
    }
  }
  if (deadline.due_text?.trim()) {
    return {
      labelDate: `${deadline.label} · ${deadline.due_text.trim()}`,
      countdown: null,
    }
  }
  return { labelDate: deadline.label, countdown: null }
}

export function pickNextDeadline(
  deadlines: DealDeadlineRow[],
  now = new Date(),
): DealDeadlineRow | null {
  const active = deadlines.filter((d) => !d.suppressed_at)
  if (!active.length) return null

  const withDate = active
    .filter((d) => d.due_at)
    .map((d) => ({ d, days: deadlineDaysUntil(d, now) ?? 999999 }))
    .sort((a, b) => {
      if (a.days !== b.days) return a.days - b.days
      return a.d.due_at!.localeCompare(b.d.due_at!)
    })

  if (withDate.length) return withDate[0]!.d

  return active[0] ?? null
}

export function formatNextDeadlineHeadline(
  deadline: DealDeadlineRow,
  options?: { now?: Date; dateDisplayFormat?: OrgDateDisplayFormat },
): {
  title: string
  subtitle: string
} {
  const now = options?.now ?? new Date()
  const dateDisplayFormat = options?.dateDisplayFormat ?? 'de-DE'
  const days = deadline.due_at ? deadlineDaysUntil(deadline, now) : null
  if (days !== null) {
    const abs = Math.abs(days)
    const unit = abs === 1 ? 'Tag' : 'Tage'
    const dateLabel = formatDeadlineDate(
      dueAtToDateIso(deadline.due_at!),
      dateDisplayFormat,
    )
    if (days < 0) {
      return {
        title: `${abs} ${unit} überfällig`,
        subtitle: `${deadline.label} · ${dateLabel}`,
      }
    }
    if (days === 0) {
      return { title: 'Heute', subtitle: `${deadline.label} · ${dateLabel}` }
    }
    return {
      title: `${days} ${unit}`,
      subtitle: `${deadline.label} · ${dateLabel}`,
    }
  }
  return {
    title: deadline.due_text?.trim() || 'Termin',
    subtitle: deadline.label,
  }
}
