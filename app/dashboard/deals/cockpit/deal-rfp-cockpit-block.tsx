import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { COPY } from '@/lib/copy'
import type { DealWithReferences } from '../types'
import { loadDealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import { DealRfpEligibilitySection } from './deal-rfp-eligibility-section'
import { DealRfpMetricsRow } from './deal-rfp-metrics-row'
import { DealRfpRecommendationBanner } from './deal-rfp-recommendation-banner'
import { DealRfpRisksSection } from './deal-rfp-risks-section'
import type { DealDocumentRow } from '../document-actions'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'

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

  if (!data) {
    return (
      <Card id="ausschreibung" className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{COPY.deals.cockpit.rfpBlockTitle}</CardTitle>
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
    )
  }

  return (
    <section id="ausschreibung" className="mb-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{COPY.deals.cockpit.rfpBlockTitle}</h2>
        <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.rfpBlockSubtitle}</p>
      </div>
      <DealRfpRecommendationBanner
        data={data}
        dealId={dealId}
        documents={documents}
        canManage={canManageDocuments}
      />
      <DealRfpMetricsRow data={data} />
      <DealRfpEligibilitySection data={data} />
      <DealRfpRisksSection data={data} />
    </section>
  )
}
