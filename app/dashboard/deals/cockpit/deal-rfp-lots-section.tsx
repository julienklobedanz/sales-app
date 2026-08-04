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
import { formatNumberDe } from '@/lib/format'
import type { TenderLot } from '@/lib/deals/tender-lots'
import { cn } from '@/lib/utils'

function formatLotValue(lot: TenderLot): string | null {
  if (lot.estimatedValueEur != null && lot.estimatedValueEur > 0) {
    return `€ ${formatNumberDe(Math.round(lot.estimatedValueEur))}`
  }
  return lot.estimatedValueText?.trim() || null
}

export function DealRfpLotsSection({ lots }: { lots: TenderLot[] }) {
  const [expanded, setExpanded] = useState(false)

  if (!lots.length) return null

  const title = `${COPY.deals.cockpit.ausschreibungNavLose} · ${lots.length}`

  return (
    <Card id="lose" className="scroll-mt-24 shadow-sm">
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
              <CardTitle className="text-base">{title}</CardTitle>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {lots.map((lot, index) => {
              const valueLabel = formatLotValue(lot)
              const key = lot.lotId ?? `${lot.title}-${index}`
              return (
                <div
                  key={key}
                  className="space-y-1.5 rounded-lg border border-border/80 bg-card px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {lot.lotId ? (
                        <span className="mr-2 font-mono text-xs text-muted-foreground">
                          {lot.lotId}
                        </span>
                      ) : null}
                      {lot.title}
                    </h3>
                    {valueLabel ? (
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {valueLabel}
                      </span>
                    ) : null}
                  </div>
                  {lot.description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {lot.description}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
