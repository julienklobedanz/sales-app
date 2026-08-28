import { ROUTES } from '@/lib/routes'

export type SubmissionWorkspaceOwner =
  | { kind: 'tender'; id: string }
  | { kind: 'deal'; id: string }

export function submissionWorkspaceHref(owner: SubmissionWorkspaceOwner): string {
  return owner.kind === 'tender'
    ? ROUTES.tenders.submission(owner.id)
    : ROUTES.deals.submission(owner.id)
}

export function submissionWorkspaceDeadlineHref(
  owner: SubmissionWorkspaceOwner,
  deadlineId: string,
): string {
  return `${submissionWorkspaceHref(owner)}/${deadlineId}`
}

export function redirectToSelectedSubmission(
  owner: SubmissionWorkspaceOwner,
  markedDeadlineIds: readonly string[],
  requestedId: string | null,
): string | null {
  const first = markedDeadlineIds[0]
  if (!first) return null
  if (!requestedId) {
    return submissionWorkspaceDeadlineHref(owner, first)
  }
  if (!markedDeadlineIds.includes(requestedId)) {
    return submissionWorkspaceDeadlineHref(owner, first)
  }
  return null
}
