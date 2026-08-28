import { COPY } from '@/lib/copy'
import {
  submissionWorkspaceDeadlineHref,
  type SubmissionWorkspaceOwner,
} from '@/lib/deals/submission-workspace-href'
import type { SubmissionWorkspaceData } from '@/lib/deals/load-submission-workspace'

import { SubmissionItemsSection } from './submission-items-section'
import { SubmissionWorkspaceLayout } from './submission-workspace-layout'

export function SubmissionWorkspaceView({
  owner,
  data,
  canMutate,
}: {
  owner: SubmissionWorkspaceOwner
  data: SubmissionWorkspaceData
  canMutate: boolean
}) {
  const rail = data.markedDeadlines.map((row) => ({
    id: row.id,
    href: submissionWorkspaceDeadlineHref(owner, row.id),
    label: row.label,
    count: row.countLabel,
  }))
  const emptyKind =
    data.markedDeadlines.length === 0
      ? 'no-target'
      : data.assignedItems.length === 0
        ? 'empty-list'
        : null

  return (
    <SubmissionWorkspaceLayout
      owner={owner}
      ownerTitle={data.ownerTitle}
      items={rail}
      currentId={data.selectedDeadline?.id ?? null}
    >
      <SubmissionItemsSection
        ownerKind={owner.kind}
        ownerId={owner.id}
        deadlineId={data.selectedDeadline?.id ?? null}
        title={
          data.selectedDeadline?.label ?? COPY.deals.cockpit.submissionWorkspaceTitle
        }
        items={data.assignedItems}
        unassignedItems={data.unassignedItems}
        canMutate={canMutate}
        markedCount={data.markedDeadlines.length}
        documents={data.ownerDocuments}
        lotProofs={data.lotProofs}
        emptyKind={emptyKind}
      />
    </SubmissionWorkspaceLayout>
  )
}
