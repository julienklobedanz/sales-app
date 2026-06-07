'use client'

import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'

function SectionBody({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{text}</p>
  )
}

export function ApprovalReferenceSections({
  summary,
  challenge,
  solution,
}: {
  summary: string | null | undefined
  challenge: string | null | undefined
  solution: string | null | undefined
}) {
  const summaryText = summary?.trim()
  const challengeText = challenge?.trim()
  const solutionText = solution?.trim()

  return (
    <div className="space-y-4">
      {summaryText ? (
        <BidOverviewCollapsibleCard
          defaultOpen
          contentClassName="px-6 pb-4"
          title={<span className="text-base font-semibold text-foreground">Kurzbeschreibung</span>}
        >
          <SectionBody text={summaryText} />
        </BidOverviewCollapsibleCard>
      ) : null}

      {challengeText ? (
        <BidOverviewCollapsibleCard
          defaultOpen
          contentClassName="px-6 pb-4"
          title={<span className="text-base font-semibold text-foreground">Herausforderung</span>}
        >
          <SectionBody text={challengeText} />
        </BidOverviewCollapsibleCard>
      ) : null}

      {solutionText ? (
        <BidOverviewCollapsibleCard
          defaultOpen={false}
          contentClassName="px-6 pb-4"
          title={<span className="text-base font-semibold text-foreground">Unsere Lösung</span>}
        >
          <SectionBody text={solutionText} />
        </BidOverviewCollapsibleCard>
      ) : null}
    </div>
  )
}
