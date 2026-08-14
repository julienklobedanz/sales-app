import type { DealDeskTimelineItem } from '@/lib/deal-desk/deal-analysis-types'
import { daysUntil } from './timeline-display'
import { getTimelineItemKind, type TimelineItemKind } from './timeline-item-visual'

export type BidProgressTimelinePoint = {
  id: string
  label: string
  sublabel: string
  dateIso: string
  kind: 'milestone' | 'today' | 'vergabe'
  positionPct: number
}

const MAX_MILESTONES = 6
const VERGABE_POINT_ID = 'timeline-vergabe'

function parseDateMs(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Vergabe-/Bekanntmachungsdatum — nur auf dem Zeitstrahl, nicht in der Fristenliste. */
export function isVergabeMilestone(title: string): boolean {
  return /vergabe|veröffentlich|veroeffentlich|published|bekanntmach|auftragsbekannt|ausschreibung.*(online|veröffent|veroeffent)/i.test(
    title,
  )
}

function isMeetingMilestone(title: string): boolean {
  return /meeting|gespräch|gespraech|termin|workshop|erstgespräch|erstgespraech|kennenlern/i.test(
    title,
  )
}

function isPresentationMilestone(title: string): boolean {
  return /präsentation|praesentation|presentation|shortlist|pitch|vorstellung|ergebnis|demo/i.test(
    title,
  )
}

function isParticipationMilestone(title: string): boolean {
  return /teilnahme|teilnahmefrist|interesse|registrier/i.test(title)
}

export function isCoreBidMilestone(title: string): boolean {
  if (isVergabeMilestone(title)) return false
  const kind = getTimelineItemKind(title)
  if (kind === 'start') return false
  if (kind === 'qa' || kind === 'submission') return true
  if (isMeetingMilestone(title)) return true
  if (isPresentationMilestone(title)) return true
  if (isParticipationMilestone(title)) return true
  return false
}

function milestonePriority(title: string, kind: TimelineItemKind): number {
  if (kind === 'qa') return 10
  if (isParticipationMilestone(title)) return 15
  if (isMeetingMilestone(title)) return 20
  if (isPresentationMilestone(title)) return 30
  if (kind === 'submission') return 90
  return 50
}

export function shortenBidMilestoneLabel(title: string): string {
  const kind = getTimelineItemKind(title)
  if (kind === 'qa') return 'Fragen'
  if (isParticipationMilestone(title)) return 'Teilnahme'
  if (isMeetingMilestone(title)) return 'Meeting'
  if (isPresentationMilestone(title)) return 'Präsentation'
  if (kind === 'submission') return 'Abgabe'
  const t = title.trim()
  if (t.length <= 14) return t
  return `${t.slice(0, 13)}…`
}

export function formatBidTimelineRelativeLabel(days: number): string {
  if (days === 0) return 'Heute'
  if (days < 0) return `vor ${Math.abs(days)}T`
  return `in ${days}T`
}

/** Vergabedatum: aus RFP oder geschätzt vor erster Frist / Abgabe. */
export function resolveVergabeDate(
  items: DealDeskTimelineItem[],
  submissionIso: string | null,
  todayIso: string,
): string {
  const sorted = [...items]
    .filter((it) => typeof it.dueDate === 'string' && it.dueDate.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const explicit = sorted.find((it) => isVergabeMilestone(it.title))
  if (explicit) return explicit.dueDate

  if (submissionIso) {
    const d = new Date(`${submissionIso.slice(0, 10)}T12:00:00`)
    d.setDate(d.getDate() - 28)
    return toIsoDate(d)
  }

  const earliest = sorted.find((it) => !isVergabeMilestone(it.title))
  if (earliest) {
    const d = new Date(`${earliest.dueDate.slice(0, 10)}T12:00:00`)
    d.setDate(d.getDate() - 14)
    return toIsoDate(d)
  }

  return todayIso
}

function selectCoreMilestones(items: DealDeskTimelineItem[]): DealDeskTimelineItem[] {
  const sorted = [...items]
    .filter((it) => typeof it.dueDate === 'string' && it.dueDate.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const submissions = sorted.filter(
    (it) => getTimelineItemKind(it.title) === 'submission',
  )
  const submissionAnchor =
    submissions.length > 0 ? submissions[submissions.length - 1]! : null
  const submissionIso = submissionAnchor?.dueDate ?? null

  let pool = sorted.filter(
    (it) => getTimelineItemKind(it.title) !== 'start' && !isVergabeMilestone(it.title),
  )
  if (submissionIso) {
    pool = pool.filter((it) => it.dueDate <= submissionIso)
  }

  const candidates = pool.filter((it) => isCoreBidMilestone(it.title))
  if (candidates.length === 0) {
    pool = pool.filter((it) => getTimelineItemKind(it.title) !== 'default')
    if (pool.length === 0 && submissionAnchor) return [submissionAnchor]
    return pool.slice(0, MAX_MILESTONES)
  }

  const byPriority = [...candidates].sort((a, b) => {
    const pa = milestonePriority(a.title, getTimelineItemKind(a.title))
    const pb = milestonePriority(b.title, getTimelineItemKind(b.title))
    if (pa !== pb) return pa - pb
    return a.dueDate.localeCompare(b.dueDate)
  })

  const picked: DealDeskTimelineItem[] = []
  const seen = new Set<string>()

  for (const item of byPriority) {
    if (picked.length >= MAX_MILESTONES) break
    const key = `${getTimelineItemKind(item.title)}-${item.dueDate}`
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(item)
  }

  if (submissionAnchor && !picked.some((p) => p.id === submissionAnchor.id)) {
    picked.push(submissionAnchor)
  }

  picked.sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  if (submissionAnchor) {
    const withoutSubmission = picked.filter((p) => p.id !== submissionAnchor.id)
    return [...withoutSubmission, submissionAnchor]
  }

  return picked
}

function computePositions(
  vergabeIso: string,
  milestones: DealDeskTimelineItem[],
  todayIso: string,
): BidProgressTimelinePoint[] {
  if (milestones.length === 0) return []

  const submission =
    milestones.find((it) => getTimelineItemKind(it.title) === 'submission') ??
    milestones[milestones.length - 1]!
  const rangeEnd = submission.dueDate
  const startMs = parseDateMs(vergabeIso)
  const endMs = parseDateMs(rangeEnd)
  const span = Math.max(endMs - startMs, 1)
  const todayDate = new Date(`${todayIso.slice(0, 10)}T12:00:00`)

  const toPct = (iso: string) => {
    const ms = parseDateMs(iso)
    return Math.min(100, Math.max(0, ((ms - startMs) / span) * 100))
  }

  const points: BidProgressTimelinePoint[] = [
    {
      id: VERGABE_POINT_ID,
      label: 'VERGABE',
      sublabel: formatBidTimelineRelativeLabel(daysUntil(vergabeIso, todayDate)),
      dateIso: vergabeIso,
      kind: 'vergabe',
      positionPct: 0,
    },
  ]

  for (const it of milestones) {
    const isSubmission = it.id === submission.id
    points.push({
      id: it.id,
      label: shortenBidMilestoneLabel(it.title).toUpperCase(),
      sublabel: formatBidTimelineRelativeLabel(daysUntil(it.dueDate, todayDate)),
      dateIso: it.dueDate,
      kind: 'milestone',
      positionPct: isSubmission ? 100 : toPct(it.dueDate),
    })
  }

  points.push({
    id: 'today',
    label: 'HEUTE',
    sublabel: '',
    dateIso: todayIso,
    kind: 'today',
    positionPct: toPct(todayIso),
  })

  return points
}

/** Adaptiver Kern-Zeitstrahl: Vergabe (links) → Fristen → Abgabe (rechts), Heute proportional. */
export function buildBidProgressTimeline(
  items: DealDeskTimelineItem[],
  now: Date = new Date(),
): BidProgressTimelinePoint[] | null {
  const nowNorm = new Date(now)
  nowNorm.setHours(0, 0, 0, 0)
  const todayIso = nowNorm.toISOString().slice(0, 10)

  const core = selectCoreMilestones(items)
  if (core.length === 0) return null

  const submissionIso =
    core.find((it) => getTimelineItemKind(it.title) === 'submission')?.dueDate ?? null
  const vergabeIso = resolveVergabeDate(items, submissionIso, todayIso)
  const points = computePositions(vergabeIso, core, todayIso)
  const sorted = points.sort((a, b) => a.positionPct - b.positionPct)

  const vergabe = sorted.find((p) => p.kind === 'vergabe')
  const submission = sorted.find((p) => p.label === 'ABGABE')
  if (vergabe) vergabe.positionPct = 0
  if (submission) submission.positionPct = 100

  return sorted
}
