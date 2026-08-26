import type { DealDeskDraftRow } from '@/lib/deal-desk/deal-analysis-types'

export type DraftRowStatus = 'ready' | 'draft' | 'gap'

/** Strukturelles Minimum — Summary-Zeile und Desk-Zeile teilen dieselbe Definition. */
export function draftRowStatus(row: {
  reference?: unknown
  answer?: string | null
}): DraftRowStatus {
  if (!row.reference) return 'gap'
  if (row.answer?.trim()) return 'ready'
  return 'draft'
}

export function countDraftQueue(
  rows: Array<{ reference?: unknown; answer?: string | null }>,
): {
  gap: number
  draft: number
} {
  let gap = 0
  let draft = 0
  for (const row of rows) {
    const status = draftRowStatus(row)
    if (status === 'gap') gap += 1
    else if (status === 'draft') draft += 1
  }
  return { gap, draft }
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
