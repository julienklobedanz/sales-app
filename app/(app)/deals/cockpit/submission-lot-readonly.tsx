import Link from 'next/link'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { submissionWorkspaceHref } from '@/lib/deals/submission-workspace-href'
import type { SubmissionWorkspaceData } from '@/lib/deals/load-submission-workspace'

import { SubmissionItemsSection } from './submission-items-section'

export function SubmissionLotReadOnly({
  tenderId,
  data,
}: {
  tenderId: string
  data: SubmissionWorkspaceData
}) {
  return (
    <section className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          {COPY.deals.cockpit.submissionWorkspaceTitle}
        </h2>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link href={submissionWorkspaceHref({ kind: 'tender', id: tenderId })}>
            {COPY.deals.cockpit.submissionItemsEditAtTender}
            <AppIcon icon={ArrowRight01Icon} size={14} className="ml-1" />
          </Link>
        </Button>
      </div>
      {data.markedDeadlines.map((row) => (
        <SubmissionItemsSection
          key={row.id}
          ownerKind="tender"
          ownerId={tenderId}
          deadlineId={row.id}
          title={row.label}
          items={row.items}
          unassignedItems={[]}
          canMutate={false}
          markedCount={data.markedDeadlines.length}
          documents={data.ownerDocuments}
          lotProofs={data.lotProofs}
          emptyKind={row.items.length === 0 ? 'empty-list' : null}
        />
      ))}
      {data.unassignedItems.length > 0 ? (
        <SubmissionItemsSection
          ownerKind="tender"
          ownerId={tenderId}
          deadlineId={null}
          title={COPY.deals.cockpit.submissionItemsUnassignedTitle}
          items={data.unassignedItems}
          unassignedItems={[]}
          canMutate={false}
          markedCount={data.markedDeadlines.length}
          documents={data.ownerDocuments}
          lotProofs={data.lotProofs}
          emptyKind={null}
        />
      ) : null}
    </section>
  )
}
