'use client'

import { useState } from 'react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { FactsDl } from '@/components/dashboard/facts-dl'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import {
  buildLotAwardLimitFactRows,
  formatLotPriorityRequired,
} from '@/lib/tenders/lot-award-limits'
import { cn } from '@/lib/utils'

import { EditTenderDialog, type EditTenderDialogTender } from './edit-tender-dialog'
import {
  TenderLotPriorityList,
  type TenderLotPriorityListItem,
} from './tender-lot-priority-list'

export function TenderFactsSurface({
  tender,
  lots = [],
  canManage = false,
}: {
  tender: EditTenderDialogTender
  lots?: TenderLotPriorityListItem[]
  canManage?: boolean
}) {
  const [expanded, setExpanded] = useState(canManage && lots.length > 0)
  const rows = buildLotAwardLimitFactRows({
    maxLotsBid: tender.max_lots_bid,
    maxLotsAward: tender.max_lots_award,
    lotPriorityRequired: tender.lot_priority_required,
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{COPY.tenders.factsTitle}</CardTitle>
        {canManage ? (
          <CardAction>
            <EditTenderDialog tender={tender} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <FactsDl rows={rows.slice(0, 2)} />
        <dl>
          <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {COPY.tenders.lotPriorityRequired}
            </dt>
            <dd className="mt-1 text-sm font-medium leading-snug">
              {formatLotPriorityRequired(tender.lot_priority_required)}
            </dd>
            {lots.length > 0 ? (
              <Collapsible open={expanded} onOpenChange={setExpanded}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <AppIcon
                      icon={ArrowRight01Icon}
                      size={16}
                      className={cn(
                        'shrink-0 transition-transform',
                        expanded && 'rotate-90',
                      )}
                    />
                    {COPY.tenders.priorityOrderToggle}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <TenderLotPriorityList
                    tenderId={tender.id}
                    lots={lots}
                    canManage={canManage}
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
