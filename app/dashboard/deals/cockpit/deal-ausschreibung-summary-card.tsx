import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import type { DealAusschreibungSummary } from '@/lib/deals/deal-ausschreibung-summary'
import { dealWorkspaceLandingHref } from '@/lib/deals/deal-workspace-href'

export function DealAusschreibungSummaryCard({
  dealId,
  summary,
}: {
  dealId: string
  summary: DealAusschreibungSummary
}) {
  return (
    <section className="mb-6 space-y-4 border-t border-border/70 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold">{COPY.deals.cockpit.rfpBlockTitle}</h2>
        <Button type="button" size="sm" asChild>
          <Link href={dealWorkspaceLandingHref(dealId)}>
            {COPY.deals.cockpit.openWorkspace}
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryMetric
          label={COPY.deals.cockpit.ausschreibungNavEignung}
          value={summary.eligibility}
        />
        <SummaryMetric
          label={COPY.deals.cockpit.metricDrafts}
          value={summary.drafts}
        />
        <SummaryMetric
          label={COPY.deals.cockpit.metricRisks}
          value={summary.risks}
        />
        <SummaryMetric
          label={COPY.deals.cockpit.metricDocuments}
          value={summary.documents}
        />
      </div>
    </section>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}
