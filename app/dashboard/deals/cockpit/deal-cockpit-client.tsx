'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { DealWithReferences } from '../types'
import { DealCockpitHeader } from './deal-cockpit-header'
import { DealCockpitPromoteCard } from './deal-cockpit-promote-card'
import { DealDocumentsSection } from './deal-documents-section'
import type { DealDocumentRow } from '../document-actions'
import { DealDeadlinesCard } from './deal-deadlines-card'
import { DealDeadlineMilestoneChips } from './deal-deadline-milestone-chips'
import { DealFactsCard } from './deal-facts-card'
import { DealProofSection } from './deal-proof-section'
import { DealSmartMatchDrawer } from './deal-smart-match-drawer'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import type { OrgDateDisplayFormat } from '@/lib/format'
import { COPY } from '@/lib/copy'
import type { DealReferenceSuggestion } from '@/lib/deals/suggest-deal-reference-matches'
import { suggestReferencesForDealAction } from '../actions'
import { DealReferenceSuggestionsRefreshProvider } from './deal-reference-suggestions-refresh'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealCockpitClient({
  deal,
  companies,
  orgProfiles,
  deadlines,
  documents,
  canManageDocuments,
  rfpBlock,
  briefingButton,
  hubspotPortalId = null,
  orgDateDisplayFormat = 'de-DE',
  initialReferenceSuggestions = [],
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  deadlines: DealDeadlineRow[]
  documents: DealDocumentRow[]
  canManageDocuments: boolean
  rfpBlock?: ReactNode
  briefingButton?: ReactNode
  hubspotPortalId?: string | null
  orgDateDisplayFormat?: OrgDateDisplayFormat
  initialReferenceSuggestions?: DealReferenceSuggestion[]
}) {
  const showRfpBlock = isRfpDeal(deal)
  const [matchDrawerOpen, setMatchDrawerOpen] = useState(false)
  const [referenceSuggestions, setReferenceSuggestions] = useState(
    initialReferenceSuggestions,
  )

  useEffect(() => {
    setReferenceSuggestions(initialReferenceSuggestions)
  }, [initialReferenceSuggestions])

  const refreshReferenceSuggestions = useCallback(async () => {
    const { suggestions } = await suggestReferencesForDealAction(deal.id)
    setReferenceSuggestions(suggestions)
  }, [deal.id])

  return (
    <DealReferenceSuggestionsRefreshProvider refresh={refreshReferenceSuggestions}>
      <div>
        <DealCockpitHeader
          deal={deal}
          companies={companies}
          orgProfiles={orgProfiles}
          canManageDocuments={canManageDocuments}
          briefingButton={showRfpBlock ? briefingButton : undefined}
        />

        {showRfpBlock ? (
          <DealDeadlineMilestoneChips
            deadlines={deadlines}
            orgDateDisplayFormat={orgDateDisplayFormat}
            className="mb-4"
          />
        ) : null}

        {/* Deadlines (~60%) | Deal-Fakten (~40%) */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-3">
            <DealDeadlinesCard
              dealId={deal.id}
              dealTitle={deal.title}
              deadlines={deadlines}
              orgDateDisplayFormat={orgDateDisplayFormat}
              showMilestoneChipsAbove={showRfpBlock}
            />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <DealFactsCard
              deal={deal}
              companies={companies}
              orgProfiles={orgProfiles}
              canManage={canManageDocuments}
              hubspotPortalId={hubspotPortalId}
              orgDateDisplayFormat={orgDateDisplayFormat}
            />
          </div>
        </div>

        <DealProofSection
          deal={deal}
          onFindReference={() => setMatchDrawerOpen(true)}
          referenceSuggestions={referenceSuggestions}
          onReferenceSuggestionsChange={setReferenceSuggestions}
        />

        {showRfpBlock && rfpBlock ? (
          <section
            id="ausschreibung"
            className="mb-6 space-y-4 border-t border-border/70 pt-8"
          >
            <h2 className="text-base font-semibold">
              {COPY.deals.cockpit.rfpBlockTitle}
            </h2>
            {rfpBlock}
          </section>
        ) : (
          <>
            <DealDocumentsSection
              dealId={deal.id}
              documents={documents}
              canManage={canManageDocuments}
              isRfpMode={false}
            />
            <div className="mb-6 border-t border-border/70 pt-8">
              <DealCockpitPromoteCard dealId={deal.id} />
            </div>
          </>
        )}

        <DealSmartMatchDrawer
          deal={deal}
          open={matchDrawerOpen}
          onOpenChange={setMatchDrawerOpen}
        />
      </div>
    </DealReferenceSuggestionsRefreshProvider>
  )
}
