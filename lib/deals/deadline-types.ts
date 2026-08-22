export type DealDeadlineKind =
  | 'submission'
  | 'questions'
  | 'presentation'
  | 'award_expected'
  | 'custom'
  | 'internal_review'

const CANONICAL_RFP_DEADLINE_KINDS: ReadonlySet<DealDeadlineKind> = new Set([
  'submission',
  'questions',
  'presentation',
  'award_expected',
])

export function isCanonicalRfpKind(kind: DealDeadlineKind): boolean {
  return CANONICAL_RFP_DEADLINE_KINDS.has(kind)
}

export const DEAL_DEADLINE_KIND_LABELS: Record<DealDeadlineKind, string> = {
  submission: 'Angebotsabgabe',
  questions: 'Fragen / Q&A',
  presentation: 'Präsentation',
  award_expected: 'Zuschlag / Vergabe',
  custom: 'Sonstiger Termin',
  internal_review: 'Interner Termin',
}
