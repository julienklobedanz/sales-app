'use client'

import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'
import {
  formatShowcaseNarrativeForDisplay,
  parseShowcaseBulletItems,
} from '@/lib/references/narrative-normalize'

const NARRATIVE_BODY_CLASS = 'w-full max-w-none text-sm leading-relaxed text-muted-foreground'

function SectionBody({ text }: { text: string }) {
  const formatted = formatShowcaseNarrativeForDisplay(text)
  const bullets = parseShowcaseBulletItems(formatted)

  if (bullets) {
    return (
      <ul className={`${NARRATIVE_BODY_CLASS} list-disc space-y-2 pl-5`}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }

  return <p className={`${NARRATIVE_BODY_CLASS} whitespace-pre-wrap`}>{formatted}</p>
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
