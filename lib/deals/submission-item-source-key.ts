import { createHash } from 'crypto'

import { normalizeDeadlineLabel } from '@/lib/deals/deadline-source-key'

export type SubmissionItemSourceInput = {
  identifier?: string | null
  title: string
}

export function normalizeSubmissionIdentifier(identifier: string): string {
  return identifier.replace(/\s+/g, '').trim().toUpperCase()
}

export function submissionItemMergeKey(item: SubmissionItemSourceInput): string {
  const identifier = item.identifier?.trim()
  if (identifier) return `id:${normalizeSubmissionIdentifier(identifier)}`
  return `title:${normalizeDeadlineLabel(item.title)}`
}

/** Stabiler Hash — Kennung vor Titel. 32 Zeichen wie Fristen. `ownerId` ist das Quelldokument. */
export function buildExtractedSubmissionItemSourceKey(
  sourceDocumentId: string,
  item: SubmissionItemSourceInput,
): string {
  const identifier = item.identifier?.trim()
  const rest = identifier
    ? normalizeSubmissionIdentifier(identifier)
    : normalizeDeadlineLabel(item.title)
  return createHash('sha256')
    .update(`${sourceDocumentId}:${rest}`, 'utf8')
    .digest('hex')
    .slice(0, 32)
}
