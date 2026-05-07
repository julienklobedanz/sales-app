'use client'

import { DealRfpSection } from '@/app/dashboard/deals/components/deal-rfp-section'
import type { DealWithReferences } from '@/app/dashboard/deals/types'

type Company = { id: string; name: string }

export function MatchRfpClient({ deal }: { deal: DealWithReferences }) {
  // MVP im Match-Tab: Deal-Kontext ist über `deal` gegeben; optionaler Account-Kontext bleibt leer.
  return <DealRfpSection deal={deal} companies={[] as Company[]} />
}

