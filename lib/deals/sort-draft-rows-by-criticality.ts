import type { DealDeskDraftRow } from '@/lib/deal-desk/deal-analysis-types'

export type DraftRowStatus = 'ready' | 'draft' | 'gap'

export function draftRowStatus(row: DealDeskDraftRow): DraftRowStatus {
  if (!row.reference) return 'gap'
  if (row.answer?.trim()) return 'ready'
  return 'draft'
}

const STATUS_ORDER: Record<DraftRowStatus, number> = {
  gap: 0,
  draft: 1,
  ready: 2,
}

/** Kritisch (Lücke) oben, bereit unten — für rot→grün Darstellung. */
export function sortDraftRowsByCriticality(rows: DealDeskDraftRow[]): DealDeskDraftRow[] {
  return [...rows].sort((a, b) => {
    const diff = STATUS_ORDER[draftRowStatus(a)] - STATUS_ORDER[draftRowStatus(b)]
    if (diff !== 0) return diff
    return a.requirement.localeCompare(b.requirement, 'de')
  })
}
