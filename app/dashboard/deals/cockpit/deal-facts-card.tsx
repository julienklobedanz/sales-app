'use client'

import { useState } from 'react'
import { PencilEdit01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { buildDealFactRows } from '@/lib/deals/deal-facts-rows'
import type { OrgDateDisplayFormat } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { DealWithReferences } from '../types'
import { EditDealDialog } from '../components/edit-deal-dialog'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealFactsCard({
  deal,
  companies,
  orgProfiles,
  canManage = false,
  orgDateDisplayFormat = 'de-DE',
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  canManage?: boolean
  orgDateDisplayFormat?: OrgDateDisplayFormat
}) {
  const [editOpen, setEditOpen] = useState(false)
  const rows = buildDealFactRows(deal, {
    dateDisplayFormat: orgDateDisplayFormat,
  })

  return (
    <>
      <Card className="group/facts relative">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{COPY.deals.cockpit.factsTitle}</CardTitle>
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 w-7 shrink-0 p-0 text-muted-foreground',
                  'opacity-0 transition-opacity',
                  'group-hover/facts:opacity-100 group-focus-within/facts:opacity-100',
                )}
                aria-label={COPY.deals.cockpit.factsEditAria}
                title={COPY.deals.cockpit.factsEditAria}
                onClick={() => setEditOpen(true)}
              >
                <AppIcon icon={PencilEdit01Icon} size={14} />
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-muted-foreground">{row.label}</span>
              <span className="max-w-[60%] truncate text-right font-medium">
                {row.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <EditDealDialog
          deal={deal}
          companies={companies}
          orgProfiles={orgProfiles}
          open={editOpen}
          onOpenChange={setEditOpen}
          showTrigger={false}
        />
      ) : null}
    </>
  )
}
