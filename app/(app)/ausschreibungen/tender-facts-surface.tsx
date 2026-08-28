'use client'

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FactsDl } from '@/components/dashboard/facts-dl'
import { COPY } from '@/lib/copy'
import { buildLotAwardLimitFactRows } from '@/lib/tenders/lot-award-limits'

import { EditTenderDialog, type EditTenderDialogTender } from './edit-tender-dialog'

export function TenderFactsSurface({
  tender,
  canManage = false,
}: {
  tender: EditTenderDialogTender
  canManage?: boolean
}) {
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
      <CardContent className="pt-0">
        <FactsDl rows={rows} />
      </CardContent>
    </Card>
  )
}
