/** Feste Reihenfolge der Deal-Seite (§10.2). Positionen rücken nicht nach. */
export const DEAL_PAGE_SECTION_IDS = [
  'identity',
  'verdict',
  'deadlines',
  'proofs',
  'ausschreibung',
  'facts',
] as const

export type DealPageSectionId = (typeof DEAL_PAGE_SECTION_IDS)[number]

export type DealPageSectionFill = 'filled' | 'empty'

export function dealPageSectionFill(args: {
  isRfpDeal: boolean
  hasAnalysis: boolean
}): Record<DealPageSectionId, DealPageSectionFill> {
  return {
    identity: 'filled',
    verdict: args.isRfpDeal && args.hasAnalysis ? 'filled' : 'empty',
    deadlines: 'filled',
    proofs: 'filled',
    ausschreibung: 'filled',
    facts: 'filled',
  }
}
