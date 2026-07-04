import { daysUntil, formatCountdown, formatDateDe } from '@/lib/deal-desk/timeline-display'

export const DEFAULT_DEADLINE_TIMEZONE = 'Europe/Berlin'

export type DealDeadlineRow = {
  id: string
  deal_id: string
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
  created_at: string
  updated_at: string
}

function dueAtToDateIso(dueAt: string): string {
  return dueAt.slice(0, 10)
}

export function deadlineDaysUntil(deadline: Pick<DealDeadlineRow, 'due_at'>, now = new Date()): number | null {
  if (!deadline.due_at) return null
  return daysUntil(dueAtToDateIso(deadline.due_at), now)
}

export function formatDeadlineCountdownLabel(
  deadline: Pick<DealDeadlineRow, 'due_at' | 'due_text' | 'is_approximate' | 'label'>,
  now = new Date()
): string {
  if (deadline.due_at) {
    const iso = dueAtToDateIso(deadline.due_at)
    const d = deadlineDaysUntil({ due_at: deadline.due_at }, now)
    if (d === null) return formatDateDe(iso)
    return `${formatDateDe(iso)} ${formatCountdown(d)}`
  }
  if (deadline.due_text?.trim()) {
    return deadline.due_text.trim()
  }
  return deadline.label
}

export function pickNextDeadline(deadlines: DealDeadlineRow[], now = new Date()): DealDeadlineRow | null {
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

export function formatNextDeadlineHeadline(deadline: DealDeadlineRow, now = new Date()): {
  title: string
  subtitle: string
} {
  const days = deadline.due_at ? deadlineDaysUntil(deadline, now) : null
  if (days !== null) {
    const abs = Math.abs(days)
    const unit = abs === 1 ? 'Tag' : 'Tage'
    if (days < 0) {
      return {
        title: `${abs} ${unit} überfällig`,
        subtitle: `${deadline.label} · ${formatDateDe(dueAtToDateIso(deadline.due_at!))}`,
      }
    }
    if (days === 0) {
      return { title: 'Heute', subtitle: deadline.label }
    }
    return {
      title: `${days} ${unit}`,
      subtitle: `${deadline.label} · ${formatDateDe(dueAtToDateIso(deadline.due_at!))}`,
    }
  }
  return {
    title: deadline.due_text?.trim() || 'Termin',
    subtitle: deadline.label,
  }
}
