'use client'

import { formatDealCollectionBandLabel } from '@/lib/tenders/format-deal-collection-band'
import type { DealCollectionBandRow } from '@/lib/tenders/group-deals-for-collection'

export function DealCollectionBand({ band }: { band: DealCollectionBandRow }) {
  return (
    <span className="text-xs leading-5 text-muted-foreground">
      {formatDealCollectionBandLabel(band)}
    </span>
  )
}
