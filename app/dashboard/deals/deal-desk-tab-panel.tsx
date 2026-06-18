import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

import { DealDeskClient } from '@/app/dashboard/deal-desk/deal-desk-client'

function DealDeskTabLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
    </div>
  )
}

export function DealDeskTabPanel({ dealId }: { dealId: string }) {
  return (
    <Suspense fallback={<DealDeskTabLoading />}>
      <DealDeskClient dealId={dealId} embedded />
    </Suspense>
  )
}
