'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { DealWithReferences } from '../types'
import { DealCockpitHeader } from './deal-cockpit-header'
import { DealCockpitPromoteCard } from './deal-cockpit-promote-card'
import { DealDocumentsSection } from './deal-documents-section'
import type { DealDocumentRow } from '../document-actions'
import { DealDeadlinesCard } from './deal-deadlines-card'
import { DealFactsCard } from './deal-facts-card'
import { DealProofSection } from './deal-proof-section'
import { DealRfpHashBridge } from './deal-rfp-hash-bridge'
import { DealSmartMatchDrawer } from './deal-smart-match-drawer'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import type { OrgDateDisplayFormat } from '@/lib/format'
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
  verdict,
  ausschreibungSummary,
  briefingButton,
  orgDateDisplayFormat = 'de-DE',
  initialReferenceSuggestions = [],
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  deadlines: DealDeadlineRow[]
  documents: DealDocumentRow[]
  canManageDocuments: boolean
  verdict?: ReactNode
  ausschreibungSummary?: ReactNode
  briefingButton?: ReactNode
  orgDateDisplayFormat?: OrgDateDisplayFormat
  initialReferenceSuggestions?: DealReferenceSuggestion[]
}) {
  const showRfp = isRfpDeal(deal)
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
        <DealRfpHashBridge dealId={deal.id} isRfpDeal={showRfp} surface="deal-page" />
        <DealCockpitHeader
          deal={deal}
          companies={companies}
          orgProfiles={orgProfiles}
          canManageDocuments={canManageDocuments}
          briefingButton={showRfp ? briefingButton : undefined}
        />

        {verdict}

        <div className="mb-6">
          <DealDeadlinesCard
            dealId={deal.id}
            dealTitle={deal.title}
            deadlines={deadlines}
            orgDateDisplayFormat={orgDateDisplayFormat}
          />
        </div>

        <DealProofSection
          deal={deal}
          onFindReference={() => setMatchDrawerOpen(true)}
          referenceSuggestions={referenceSuggestions}
          onReferenceSuggestionsChange={setReferenceSuggestions}
        />

        {showRfp ? (
          documents.length > 0 && ausschreibungSummary ? (
            ausschreibungSummary
          ) : (
            <DealDocumentsSection
              dealId={deal.id}
              documents={documents}
              canManage={canManageDocuments}
              isRfpMode
            />
          )
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

        <DealFactsCard
          deal={deal}
          companies={companies}
          orgProfiles={orgProfiles}
          canManage={canManageDocuments}
          orgDateDisplayFormat={orgDateDisplayFormat}
        />

        <DealSmartMatchDrawer
          deal={deal}
          open={matchDrawerOpen}
          onOpenChange={setMatchDrawerOpen}
        />
      </div>
    </DealReferenceSuggestionsRefreshProvider>
  )
}
