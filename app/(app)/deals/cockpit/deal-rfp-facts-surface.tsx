'use client'

import { useState } from 'react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { FactsDl } from '@/components/dashboard/facts-dl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { COPY } from '@/lib/copy'
import type { RfpStammdatenRow } from '@/lib/deals/build-rfp-stammdaten-rows'
import { splitRfpFactsRows } from '@/lib/deals/split-rfp-facts-rows'
import type { TenderLot } from '@/lib/deals/tender-lots'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

import { DealRfpLotsSection } from './deal-rfp-lots-section'

export function DealRfpFactsSurface({
  rows,
  lots,
}: {
  rows: RfpStammdatenRow[]
  lots: TenderLot[]
}) {
  const [expanded, setExpanded] = useState(false)
  const { identity, tail } = splitRfpFactsRows(rows)

  return (
    <div className="mb-6 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{COPY.deals.cockpit.rfpFactsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {identity.length > 0 ? (
            <FactsDl rows={identity} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {COPY.deals.cockpit.stammdatenEmpty}
            </p>
          )}
          {tail.length > 0 ? (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <AppIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    className={cn(
                      'shrink-0 transition-transform',
                      expanded && 'rotate-90',
                    )}
                  />
                  {COPY.deals.cockpit.rfpFactsExpand}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <FactsDl rows={tail} />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </CardContent>
      </Card>
      <DealRfpLotsSection lots={lots} />
    </div>
  )
}
