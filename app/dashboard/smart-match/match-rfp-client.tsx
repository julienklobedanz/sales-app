'use client'

import { DealRfpSection } from '@/app/dashboard/deals/components/deal-rfp-section'
import type { DealWithReferences } from '@/app/dashboard/deals/types'

type Company = { id: string; name: string }

export function MatchRfpClient({
  deal,
  companies,
}: {
  deal: DealWithReferences
  companies: Company[]
}) {
  return <DealRfpSection deal={deal} companies={companies} />
}

