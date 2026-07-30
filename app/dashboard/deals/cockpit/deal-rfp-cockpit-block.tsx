import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { COPY } from '@/lib/copy'
import type { DealWithReferences } from '../types'
import { loadDealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import { buildAusschreibungNavItems } from '@/lib/deals/build-ausschreibung-nav-items'

import { DealRfpAusschreibungNav } from './deal-rfp-ausschreibung-nav'
import { DealRfpDraftsSection } from './deal-rfp-drafts-section'
import { DealRfpEligibilitySection } from './deal-rfp-eligibility-section'
import { DealRfpRecommendationBanner } from './deal-rfp-recommendation-banner'
import { DealRfpRisksSection } from './deal-rfp-risks-section'
import { DealRfpStammdatenSection } from './deal-rfp-stammdaten-section'
import { DealDocumentsSection } from './deal-documents-section'
import type { DealDocumentRow } from '../document-actions'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'
import { DealRfpNoticeHero } from './deal-rfp-notice-hero'
import { DealRfpLotsSection } from './deal-rfp-lots-section'

/** Full Ausschreibung stack: sticky nav → documents → analysis cards. */
export async function DealRfpCockpitBlock({
  dealId,
  orgId,
  deal,
  documents,
  canManageDocuments,
  dealContext,
}: {
  dealId: string
  orgId: string
  deal: DealWithReferences
  documents: DealDocumentRow[]
  canManageDocuments: boolean
  dealContext?: {
    industry?: string | null
    volume?: string | null
    title?: string | null
  }
}) {
  const supabase = await createServerSupabaseClient()
  const data = await loadDealRfpCockpitData(supabase, orgId, dealId, dealContext)

  const draftsCovered = data ? data.draftRows.filter((r) => Boolean(r.reference)).length : 0
  const risksCount = data?.risks
    ? data.risks.redFlags.length + data.risks.smeOpenCount
    : 0
  const eligibilityCount = data?.eligibilityAssessment?.criteria.length ?? 0
  const lotsCount = data?.tenderLots.length ?? 0

  return (
    <div className="space-y-4">
      {data ? <DealRfpNoticeHero deal={deal} data={data} /> : null}

      <DealRfpAusschreibungNav
        items={buildAusschreibungNavItems({
          stammdatenCount: data?.stammdatenRows.length ?? 0,
          eligibilityCount,
          risksCount,
          draftsCovered,
          draftsTotal: data?.draftRows.length ?? 0,
          lotsCount,
          showAnalysisLinks: Boolean(data),
        })}
      />

      <DealDocumentsSection
        dealId={dealId}
        documents={documents}
        canManage={canManageDocuments}
        isRfpMode
        rfpHasAnalysis={Boolean(data?.hasAnalysis)}
        rfpAnalysisStale={Boolean(data?.isStale)}
      />

      {!data ? (
        <Card>
          <CardHeader>
            <CardDescription>{COPY.deals.cockpit.rfpBlockEmpty}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.length > 0 && canManageDocuments ? (
              <DealRfpAnalyzeButton
                dealId={dealId}
                documents={documents}
                canManage={canManageDocuments}
                hasAnalysis={false}
                isStale={false}
                variant="outline"
              />
            ) : (
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="#dokumente">{COPY.deals.cockpit.rfpAnalyzeCta}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <DealRfpRecommendationBanner
            data={data}
            dealId={dealId}
            documents={documents}
            canManage={canManageDocuments}
          />
          <DealRfpStammdatenSection data={data} />
          <DealRfpLotsSection lots={data.tenderLots} />
          <DealRfpEligibilitySection data={data} />
          <DealRfpRisksSection data={data} />
          <DealRfpDraftsSection data={data} deal={deal} />
        </>
      )}
    </div>
  )
}
