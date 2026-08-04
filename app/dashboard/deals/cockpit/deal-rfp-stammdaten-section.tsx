'use client'

import { useState } from 'react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { cn } from '@/lib/utils'

/** Document facts from the RFP snapshot — collapsed by default. */
export function DealRfpStammdatenSection({ data }: { data: DealRfpCockpitData }) {
  const rows = data.stammdatenRows
  const [expanded, setExpanded] = useState(false)

  return (
    <Card id="stammdaten" className="scroll-mt-24 shadow-sm">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-start gap-2 text-left">
              <AppIcon
                icon={ArrowRight01Icon}
                size={16}
                className={cn(
                  'mt-0.5 shrink-0 text-muted-foreground transition-transform',
                  expanded && 'rotate-90',
                )}
              />
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {rows.length > 0
                    ? `${COPY.deals.cockpit.stammdatenTitle} · ${rows.length}`
                    : COPY.deals.cockpit.stammdatenTitle}
                </CardTitle>
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {rows.length === 0 ? (
              <p className="pl-6 text-sm text-muted-foreground">
                {COPY.deals.cockpit.stammdatenEmpty}
              </p>
            ) : (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 pl-6 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <div key={row.key} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium leading-snug">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
