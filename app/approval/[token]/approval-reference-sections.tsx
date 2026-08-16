'use client'

import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'
import { ReferenceContentCore } from '@/components/references/reference-content-core'

export function ApprovalReferenceSections({
  summary,
  challenge,
  solution,
}: {
  summary: string | null | undefined
  challenge: string | null | undefined
  solution: string | null | undefined
}) {
  return (
    <ReferenceContentCore
      surface="reduced"
      summary={summary}
      challenge={challenge}
      solution={solution}
      renderSection={({ title, children, fieldId }) => (
        <BidOverviewCollapsibleCard
          defaultOpen={fieldId !== 'solution'}
          contentClassName="px-6 pb-4"
          title={
            <span className="text-base font-semibold text-foreground">{title}</span>
          }
        >
          {children}
        </BidOverviewCollapsibleCard>
      )}
    />
  )
}
