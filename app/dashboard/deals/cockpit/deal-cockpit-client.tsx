'use client'

import { DealMatchSection } from '../components/deal-match-section'
import { DealRfpSection } from '../components/deal-rfp-section'
import { DealDetailContent } from '../deal-detail-content'
import type { DealWithReferences } from '../types'
import type { DealActivityItem } from './deal-activity-card'
import { DealActivityCard } from './deal-activity-card'
import { DealCockpitHeader } from './deal-cockpit-header'
import { DealCockpitPromoteCard } from './deal-cockpit-promote-card'
import { DealFactsCard } from './deal-facts-card'
import { DealRfpBlockPlaceholder } from './deal-rfp-block-placeholder'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import { COPY } from '@/lib/copy'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealCockpitClient({
  deal,
  activities,
  companies,
  orgProfiles,
}: {
  deal: DealWithReferences
  activities: DealActivityItem[]
  companies: Company[]
  orgProfiles: OrgProfile[]
}) {
  const showRfpBlock = isRfpDeal(deal)

  return (
    <div>
      <DealCockpitHeader deal={deal} companies={companies} orgProfiles={orgProfiles} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        <DealFactsCard deal={deal} />
        <DealActivityCard dealId={deal.id} activities={activities} />
      </div>

      {showRfpBlock ? <div className="mb-6"><DealRfpBlockPlaceholder /></div> : null}

      {!showRfpBlock ? (
        <div className="mb-6">
          <DealCockpitPromoteCard dealId={deal.id} />
        </div>
      ) : null}

      <p className="mb-4 text-xs text-muted-foreground">{COPY.deals.cockpit.legacySectionNote}</p>

      <div className="space-y-6">
        <DealRfpSection deal={deal} companies={companies} initialResult={null} />
        <DealMatchSection deal={deal} />
        <DealDetailContent deal={deal} />
      </div>
    </div>
  )
}
