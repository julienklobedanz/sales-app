import { dueAtToDateIso } from './deadline-display'

export type ResolvedDealDeadline = {
  date: string | null
  text: string | null
  isApproximate: boolean
  origin: 'lot' | 'tender' | 'legacy'
}

export type SubmissionDeadlineInput = {
  due_at: string | null
  due_text: string | null
  is_approximate: boolean
  suppressed_at: string | null
}

export const EMPTY_RESOLVED_DEADLINE: ResolvedDealDeadline = {
  date: null,
  text: null,
  isApproximate: false,
  origin: 'legacy',
}

export function resolvedFromExpiry(expiryDate: string | null): ResolvedDealDeadline {
  return {
    date: expiryDate,
    text: null,
    isApproximate: false,
    origin: 'legacy',
  }
}

function pickActiveSubmission(
  rows: SubmissionDeadlineInput[],
): SubmissionDeadlineInput | null {
  const active = rows.filter((row) => row.suppressed_at == null)
  const dated = active
    .filter((row) => row.due_at)
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
  if (dated[0]) return dated[0]
  return active.find((row) => row.due_text?.trim()) ?? null
}

function fromSubmission(
  row: SubmissionDeadlineInput,
  origin: 'lot' | 'tender',
): ResolvedDealDeadline {
  const date = row.due_at ? dueAtToDateIso(row.due_at) : null
  return {
    date,
    text: date ? null : row.due_text?.trim() || null,
    isApproximate: row.is_approximate,
    origin,
  }
}

export function resolveDealDeadline(args: {
  lotSubmissions: SubmissionDeadlineInput[]
  tenderSubmissions: SubmissionDeadlineInput[]
  expiryDate: string | null
}): ResolvedDealDeadline {
  const lot = pickActiveSubmission(args.lotSubmissions)
  if (lot) return fromSubmission(lot, 'lot')
  const tender = pickActiveSubmission(args.tenderSubmissions)
  if (tender) return fromSubmission(tender, 'tender')
  return resolvedFromExpiry(args.expiryDate)
}

export function compareResolvedDeadlines(
  a: ResolvedDealDeadline,
  b: ResolvedDealDeadline,
): number {
  if (a.date === b.date) return 0
  if (!a.date) return 1
  if (!b.date) return -1
  return a.date.localeCompare(b.date)
}

export function earliestResolvedDeadline(
  items: ResolvedDealDeadline[],
): ResolvedDealDeadline {
  if (items.length === 0) return EMPTY_RESOLVED_DEADLINE
  return [...items].sort(compareResolvedDeadlines)[0] ?? EMPTY_RESOLVED_DEADLINE
}
