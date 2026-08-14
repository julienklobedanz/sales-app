import { COPY } from '@/lib/copy'
import {
  DEAL_DEADLINE_KIND_LABELS,
  type DealDeadlineKind,
} from '@/lib/deals/deadline-types'
import { deadlineDaysUntil, type DealDeadlineRow } from '@/lib/deals/deadline-display'
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
}

function chipShortLabel(kind: DealDeadlineKind, rowLabel: string): string {
  const fixed = SHORT_KIND_LABELS[kind]
  if (kind !== 'custom' && fixed) return fixed

  const label = rowLabel.trim()
  if (!label) return fixed ?? 'Termin'

  const words = label.split(/\s+/).filter(Boolean)
  // For custom timelines, 2 words are often too generic (e.g. "Öffnung der").
  // Prefer up to 3 words if the label is still reasonably short.
  if (words.length <= 3 && label.length <= 28) return label

  const threeWords = words.slice(0, 3).join(' ')
  if (threeWords.length <= 26) return threeWords

  const twoWords = words.slice(0, 2).join(' ')
  if (twoWords.length <= 22) return twoWords

  return `${twoWords.slice(0, 20).trim()}…`
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

export function compactRelativeDays(days: number): string {
  if (days < 0) {
    const n = Math.abs(days)
    return n === 1
      ? COPY.deals.cockpit.deadlineOverdueOne
      : COPY.deals.cockpit.deadlineOverdue.replace('{n}', String(n))
  }
  if (days === 0) return COPY.deals.cockpit.deadlineToday
  if (days === 1) return COPY.deals.cockpit.deadlineInOneDay
  return COPY.deals.cockpit.deadlineInDays.replace('{n}', String(days))
}

function isCanonicalKind(kind: string): kind is DealDeadlineKind {
  return kind in DEAL_DEADLINE_KIND_LABELS
}

export function buildDeadlineMilestoneChips(
  deadlines: DealDeadlineRow[],
  options?: { now?: Date; dateDisplayFormat?: OrgDateDisplayFormat },
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
      shortLabel: chipShortLabel(kind, row.label || kindLabel),
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
