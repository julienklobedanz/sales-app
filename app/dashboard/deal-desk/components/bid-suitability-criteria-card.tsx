'use client'

import { ClipboardList } from 'lucide-react'

import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'
import type { DealDeskSuitabilityCriteria } from '@/lib/deal-desk/deal-desk-bid-enrichment'
import { cn } from '@/lib/utils'

type Props = {
  criteria: DealDeskSuitabilityCriteria
  className?: string
  defaultOpen?: boolean
}

function CriteriaColumn({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="min-w-0">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2 leading-snug">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function BidSuitabilityCriteriaCard({
  criteria,
  className,
  defaultOpen = true,
}: Props) {
  const hasAny =
    criteria.bidderRequirements.length > 0 ||
    criteria.roleQualifications.length > 0 ||
    criteria.specialConditions.length > 0

  return (
    <BidOverviewCollapsibleCard
      defaultOpen={defaultOpen}
      className={cn('rounded-xl border border-slate-200/80 bg-white', className)}
      contentClassName="pt-4 pb-6"
      title={
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          Eignung &amp; Rahmenbedingungen
        </span>
      }
    >
      {hasAny ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CriteriaColumn title="Anforderungen an den Bieter" items={criteria.bidderRequirements} />
          <CriteriaColumn title="Rollenqualifikationen" items={criteria.roleQualifications} />
          <CriteriaColumn title="Besondere Bedingungen" items={criteria.specialConditions} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch keine Eignungs- und Rahmenbedingungen aus dem RFP extrahiert. Nach einer vollständigen
          Analyse erscheinen hier Zertifizierungen, Rollenqualifikationen und besondere Vertragsbedingungen.
        </p>
      )}
    </BidOverviewCollapsibleCard>
  )
}
