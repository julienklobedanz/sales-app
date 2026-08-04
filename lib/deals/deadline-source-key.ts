import { createHash, randomUUID } from 'crypto'

import { isVergabeMilestone } from '@/lib/deal-desk/bid-timeline-milestones'
import { getTimelineItemKind } from '@/lib/deal-desk/timeline-item-visual'

import type { DealDeadlineKind } from './deadline-types'
import { isCanonicalRfpKind } from './deadline-types'

export function normalizeDeadlineLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function inferDeadlineKindFromTitle(title: string): DealDeadlineKind {
  if (isVergabeMilestone(title)) return 'award_expected'
  const timelineKind = getTimelineItemKind(title)
  if (timelineKind === 'qa') return 'questions'
  if (timelineKind === 'submission') return 'submission'
  if (
    /präsentation|praesentation|presentation|shortlist|pitch|vorstellung|demo/i.test(
      title,
    )
  ) {
    return 'presentation'
  }
  if (timelineKind === 'start') return 'internal_review'
  return 'custom'
}

/** Stabiler Hash — keine LLM-IDs, keine Array-Indizes. */
export function buildRfpDeadlineSourceKey(
  dealId: string,
  kind: DealDeadlineKind,
  label?: string,
): string {
  const base = `${dealId}:${kind}`
  if (isCanonicalRfpKind(kind)) {
    return createHash('sha256').update(base, 'utf8').digest('hex').slice(0, 32)
  }
  const norm = normalizeDeadlineLabel(label ?? '')
  return createHash('sha256').update(`${base}:${norm}`, 'utf8').digest('hex').slice(0, 32)
}

export function buildManualDeadlineSourceKey(): string {
  return `manual:${randomUUID()}`
}
