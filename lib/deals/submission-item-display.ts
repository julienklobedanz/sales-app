import { COPY } from '@/lib/copy'

export type SubmissionItemState = 'open' | 'provided' | 'not_applicable'
export type SubmissionItemReview = 'confirmed' | 'dismissed'

export type SubmissionItemCountInput = {
  state: SubmissionItemState
  confidence: 'high' | 'low'
  review: SubmissionItemReview | null
}

export type SubmissionItemCounts = {
  total: number
  open: number
  unreviewed: number
}

export function isVisibleSubmissionItem(
  item: Pick<SubmissionItemCountInput, 'review'>,
): boolean {
  return item.review !== 'dismissed'
}

export function isUnreviewedSubmissionItem(item: SubmissionItemCountInput): boolean {
  return item.confidence === 'low' && item.review == null
}

export function countSubmissionItems(
  items: readonly SubmissionItemCountInput[],
): SubmissionItemCounts {
  const visible = items.filter(isVisibleSubmissionItem)
  return {
    total: visible.length,
    open: visible.filter((item) => item.state === 'open').length,
    unreviewed: visible.filter(isUnreviewedSubmissionItem).length,
  }
}

export function shouldAutoAssignUnassignedSubmissionItems(args: {
  canMutate: boolean
  markedCount: number
}): boolean {
  return args.canMutate && args.markedCount === 1
}

export function formatSubmissionWorkspaceTileState(
  marked: ReadonlyArray<{ items: readonly SubmissionItemCountInput[] }>,
): string | null {
  if (marked.length === 0) return null
  return formatSubmissionItemCounts(
    countSubmissionItems(marked.flatMap((row) => row.items)),
  )
}

export function formatSubmissionItemCounts(counts: SubmissionItemCounts): string {
  const total = (
    counts.total === 1
      ? COPY.deals.cockpit.submissionItemsCountSingular
      : COPY.deals.cockpit.submissionItemsCountPlural
  ).replace('{count}', String(counts.total))
  const open = COPY.deals.cockpit.submissionItemsOpen.replace(
    '{count}',
    String(counts.open),
  )
  const parts = [total, open]
  if (counts.unreviewed > 0) {
    parts.push(
      COPY.deals.cockpit.submissionItemsUnreviewed.replace(
        '{count}',
        String(counts.unreviewed),
      ),
    )
  }
  return parts.join(' · ')
}

export function nextSubmissionItemState(state: SubmissionItemState): SubmissionItemState {
  if (state === 'open') return 'provided'
  if (state === 'provided') return 'not_applicable'
  return 'open'
}

export function isReferenceListItem(title: string): boolean {
  return /referenzliste/i.test(title.normalize('NFKD'))
}

export function cycleSubmissionItemStateFields(
  state: SubmissionItemState,
  userId: string,
  nowIso: string,
): {
  state: SubmissionItemState
  not_applicable_at: string | null
  not_applicable_by: string | null
  document_id?: null
} {
  const next = nextSubmissionItemState(state)
  if (next === 'not_applicable') {
    return {
      state: next,
      not_applicable_at: nowIso,
      not_applicable_by: userId,
    }
  }
  return {
    state: next,
    not_applicable_at: null,
    not_applicable_by: null,
    ...(next === 'open' ? { document_id: null } : {}),
  }
}
