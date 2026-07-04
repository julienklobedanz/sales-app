'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import type { DealWithReferences } from '../types'
import type { DealActivityItem } from './deal-activity-card'
import { DealActivityCard } from './deal-activity-card'
import { DealCockpitHeader } from './deal-cockpit-header'
import { DealCockpitPromoteCard } from './deal-cockpit-promote-card'
import { DealDocumentsSection } from './deal-documents-section'
import type { DealDocumentRow } from '../document-actions'
import { DealDeadlinesCard } from './deal-deadlines-card'
import { DealFactsCard } from './deal-facts-card'
import { DealProofSection } from './deal-proof-section'
import { DealSmartMatchDrawer } from './deal-smart-match-drawer'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealCockpitClient({
  deal,
  activities,
  companies,
  orgProfiles,
  deadlines,
  documents,
  canManageDocuments,
  rfpBlock,
  briefingButton,
}: {
  deal: DealWithReferences
  activities: DealActivityItem[]
  companies: Company[]
  orgProfiles: OrgProfile[]
  deadlines: DealDeadlineRow[]
  documents: DealDocumentRow[]
  canManageDocuments: boolean
  rfpBlock?: ReactNode
  briefingButton?: ReactNode
}) {
  const showRfpBlock = isRfpDeal(deal)
  const [matchDrawerOpen, setMatchDrawerOpen] = useState(false)

  return (
    <div>
      <DealCockpitHeader
        deal={deal}
        companies={companies}
        orgProfiles={orgProfiles}
        briefingButton={showRfpBlock ? briefingButton : undefined}
      />

      <DealDeadlinesCard dealId={deal.id} deadlines={deadlines} />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DealFactsCard deal={deal} />
        <DealActivityCard activities={activities} />
      </div>

      <DealDocumentsSection
        dealId={deal.id}
        documents={documents}
        canManage={canManageDocuments}
        isRfpMode={showRfpBlock}
      />

      {showRfpBlock && rfpBlock ? <div className="mb-6">{rfpBlock}</div> : null}

      {!showRfpBlock ? (
        <div className="mb-6">
          <DealCockpitPromoteCard dealId={deal.id} />
        </div>
      ) : null}

      <DealProofSection deal={deal} onFindReference={() => setMatchDrawerOpen(true)} />

      <DealSmartMatchDrawer deal={deal} open={matchDrawerOpen} onOpenChange={setMatchDrawerOpen} />
    </div>
  )
}
