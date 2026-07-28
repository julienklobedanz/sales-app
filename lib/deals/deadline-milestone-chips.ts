import {
  DEAL_DEADLINE_KIND_LABELS,
  type DealDeadlineKind,
} from '@/lib/deals/deadline-types'
import {
  deadlineDaysUntil,
  type DealDeadlineRow,
} from '@/lib/deals/deadline-display'
import { formatReferenceDate, type OrgDateDisplayFormat } from '@/lib/format'

const MILESTONE_KIND_ORDER: DealDeadlineKind[] = [
  'questions',
  'submission',
  'presentation',
  'award_expected',
  'internal_review',
]

const SHORT_KIND_LABELS: Partial<Record<DealDeadlineKind, string>> = {
  questions: 'Fragen',
  submission: 'Abgabe',
  presentation: 'Präsentation',
  award_expected: 'Vergabe',
  internal_review: 'Intern',
  custom: 'Termin',
}

export type DeadlineMilestoneChip = {
  id: string
  kind: DealDeadlineKind
  shortLabel: string
  fullLabel: string
  dueAtIso: string
  daysUntil: number
  relativeLabel: string
  absoluteDateLabel: string
  isOverdue: boolean
  isToday: boolean
  isNextFuture: boolean
}

function compactRelativeDays(days: number): string {
  if (days < 0) return `−${Math.abs(days)} T`
  if (days === 0) return 'heute'
  return `in ${days} T`
}

function isCanonicalKind(kind: string): kind is DealDeadlineKind {
  return kind in DEAL_DEADLINE_KIND_LABELS
}

export function buildDeadlineMilestoneChips(
  deadlines: DealDeadlineRow[],
  options?: { now?: Date; dateDisplayFormat?: OrgDateDisplayFormat }
): DeadlineMilestoneChip[] {
  const now = options?.now ?? new Date()
  const dateDisplayFormat = options?.dateDisplayFormat ?? 'de-DE'

  const active = deadlines.filter((d) => !d.suppressed_at && d.due_at)
  const byKind = new Map<DealDeadlineKind, DealDeadlineRow>()

  for (const row of active) {
    const kind = isCanonicalKind(row.kind) ? row.kind : 'custom'
    const prev = byKind.get(kind)
    if (!prev || (row.due_at && prev.due_at && row.due_at < prev.due_at)) {
      byKind.set(kind, row)
    }
  }

  const customRows = active
    .filter((d) => !isCanonicalKind(d.kind) || d.kind === 'custom')
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
    .slice(0, 2)

  const ordered: DealDeadlineRow[] = []
  for (const kind of MILESTONE_KIND_ORDER) {
    const row = byKind.get(kind)
    if (row) ordered.push(row)
  }
  for (const row of customRows) {
    if (!ordered.some((r) => r.id === row.id)) ordered.push(row)
  }

  const chips: DeadlineMilestoneChip[] = []
  for (const row of ordered) {
    const kind = isCanonicalKind(row.kind) ? row.kind : 'custom'
    const days = deadlineDaysUntil(row, now)
    if (days === null) continue

    if (kind === 'award_expected' && days < -30) {
      continue
    }

    const dueIso = row.due_at!.slice(0, 10)
    const kindLabel = DEAL_DEADLINE_KIND_LABELS[kind]
    chips.push({
      id: row.id,
      kind,
      shortLabel: SHORT_KIND_LABELS[kind] ?? kindLabel,
      fullLabel: row.label || kindLabel,
      dueAtIso: dueIso,
      daysUntil: days,
      relativeLabel: compactRelativeDays(days),
      absoluteDateLabel: formatReferenceDate(dueIso, dateDisplayFormat),
      isOverdue: days < 0,
      isToday: days === 0,
      isNextFuture: false,
    })
  }

  const future = chips.filter((c) => c.daysUntil >= 0)
  if (future.length > 0) {
    const next = future.reduce((a, b) => (a.daysUntil <= b.daysUntil ? a : b))
    for (const c of chips) {
      c.isNextFuture = c.id === next.id
    }
  }

  return chips
}
