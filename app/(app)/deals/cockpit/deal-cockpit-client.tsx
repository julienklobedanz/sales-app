'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { DealWithReferences } from '../types'
import { DealCockpitHeader } from './deal-cockpit-header'
import { DealCockpitPromoteCard } from './deal-cockpit-promote-card'
import { DealDocumentsSection } from './deal-documents-section'
import type { DealDocumentRow } from '../document-actions'
import { DealDeadlinesCard } from './deal-deadlines-card'
import { DealProofSection } from './deal-proof-section'
import { DealRfpHashBridge } from './deal-rfp-hash-bridge'
import { DealSmartMatchDrawer } from './deal-smart-match-drawer'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import type { OrgDateDisplayFormat } from '@/lib/format'
import type { DealReferenceSuggestion } from '@/lib/deals/suggest-deal-reference-matches'
import { suggestReferencesForDealAction } from '../actions'
import { DealReferenceSuggestionsRefreshProvider } from './deal-reference-suggestions-refresh'
import { buildCollectionObjectUrl } from '@/lib/dashboard/use-collection-object-selection'
import {
  DEAL_MATCH_PARAM,
  DEAL_MATCH_PARAM_VALUE,
  parseDealMatchOpen,
} from '@/lib/deals/deal-match-href'

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
  workspaceTiles,
  rfpFacts,
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
  workspaceTiles?: ReactNode
  rfpFacts?: ReactNode
  briefingButton?: ReactNode
  orgDateDisplayFormat?: OrgDateDisplayFormat
  initialReferenceSuggestions?: DealReferenceSuggestion[]
}) {
  const showRfp = isRfpDeal(deal)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const matchDrawerOpen = parseDealMatchOpen(searchParams)
  const [referenceSuggestions, setReferenceSuggestions] = useState(
    initialReferenceSuggestions,
  )

  const setMatchDrawerOpen = useCallback(
    (open: boolean) => {
      router.replace(
        buildCollectionObjectUrl(pathname, searchParams, {
          [DEAL_MATCH_PARAM]: open ? DEAL_MATCH_PARAM_VALUE : null,
        }),
        { scroll: false },
      )
    },
    [router, pathname, searchParams],
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
            owner={{ kind: 'deal', id: deal.id, title: deal.title }}
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
          documents.length > 0 && workspaceTiles ? (
            workspaceTiles
          ) : (
            <DealDocumentsSection
              owner={{
                kind: 'deal',
                id: deal.id,
                title: deal.title,
                tenderId: deal.tender_id,
              }}
              documents={documents}
              canManage={canManageDocuments}
              isRfpMode
            />
          )
        ) : (
          <>
            <DealDocumentsSection
              owner={{
                kind: 'deal',
                id: deal.id,
                title: deal.title,
                tenderId: deal.tender_id,
              }}
              documents={documents}
              canManage={canManageDocuments}
              isRfpMode={false}
            />
            <div className="mb-6 border-t border-border/70 pt-8">
              <DealCockpitPromoteCard dealId={deal.id} />
            </div>
          </>
        )}

        {rfpFacts}

        <DealSmartMatchDrawer
          deal={deal}
          open={matchDrawerOpen}
          onOpenChange={setMatchDrawerOpen}
        />
      </div>
    </DealReferenceSuggestionsRefreshProvider>
  )
}
