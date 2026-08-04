'use client'

import dynamic from 'next/dynamic'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { COPY } from '@/lib/copy'
import { dealWithReferencesToRow } from '@/lib/deals/deal-with-references-to-row'

import type { DealWithReferences } from '../types'

const SmartMatchShell = dynamic(
  () =>
    import('@/app/dashboard/smart-match/smart-match-shell').then(
      (m) => m.SmartMatchShell,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-8 text-sm text-muted-foreground">
        Smart Match wird geladen …
      </p>
    ),
  },
)

export function DealSmartMatchDrawer({
  deal,
  open,
  onOpenChange,
}: {
  deal: DealWithReferences
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const dealRow = dealWithReferencesToRow(deal)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{COPY.deals.cockpit.findReferenceTitle}</SheetTitle>
          <SheetDescription>
            {COPY.deals.cockpit.findReferenceDescription}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 pt-2">
          {open ? (
            <SmartMatchShell
              deals={[dealRow]}
              initialDealId={deal.id}
              variant="embedded"
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
