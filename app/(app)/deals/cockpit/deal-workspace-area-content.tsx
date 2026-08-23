import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { dealWorkspaceAreaHref } from '@/lib/deals/deal-workspace-href'
import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import type { DealWorkspaceRiskEntry } from '@/lib/deals/deal-workspace-risk-entry'
import type { DealWithReferences } from '../types'
import type { DealDocumentRow } from '../document-actions'

import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'
import { DealRfpDraftsSection } from './deal-rfp-drafts-section'
import { DealRfpEligibilitySection } from './deal-rfp-eligibility-section'
import { DealRfpRisksSection } from './deal-rfp-risks-section'
import { DealRfpStammdatenSection } from './deal-rfp-stammdaten-section'
import { DealDocumentsSection } from './deal-documents-section'
import { DealRfpNoticeHero } from './deal-rfp-notice-hero'
import { DealRfpLotsSection } from './deal-rfp-lots-section'

function DealWorkspaceAnalyzeEmpty({
  dealId,
  documents,
  canManage,
  description,
}: {
  dealId: string
  documents: DealDocumentRow[]
  canManage: boolean
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length > 0 && canManage ? (
          <DealRfpAnalyzeButton
            dealId={dealId}
            documents={documents}
            canManage={canManage}
            hasAnalysis={false}
            isStale={false}
            variant="outline"
          />
        ) : (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={dealWorkspaceAreaHref(dealId, 'dokumente')}>
              {COPY.deals.cockpit.rfpAnalyzeCta}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function DealWorkspaceAreaContent({
  area,
  dealId,
  deal,
  documents,
  canManageDocuments,
  data,
  riskEntries = [],
}: {
  area: DealWorkspaceArea
  dealId: string
  deal: DealWithReferences
  documents: DealDocumentRow[]
  canManageDocuments: boolean
  data: DealRfpCockpitData | null
  riskEntries?: DealWorkspaceRiskEntry[]
}) {
  if (area === 'dokumente') {
    return (
      <div className="space-y-4">
        <DealDocumentsSection
          dealId={dealId}
          documents={documents}
          canManage={canManageDocuments}
          isRfpMode
          rfpHasAnalysis={Boolean(data?.hasAnalysis)}
          rfpAnalysisStale={Boolean(data?.isStale)}
          forceExpanded
        />
        {!data ? (
          <DealWorkspaceAnalyzeEmpty
            dealId={dealId}
            documents={documents}
            canManage={canManageDocuments}
            description={COPY.deals.cockpit.rfpBlockEmpty}
          />
        ) : null}
      </div>
    )
  }

  if (!data) {
    return (
      <DealWorkspaceAnalyzeEmpty
        dealId={dealId}
        documents={documents}
        canManage={canManageDocuments}
        description={COPY.deals.cockpit.rfpBlockEmpty}
      />
    )
  }

  switch (area) {
    case 'steckbrief':
      return <DealRfpNoticeHero deal={deal} data={data} />
    case 'stammdaten':
      return <DealRfpStammdatenSection data={data} />
    case 'lose':
      return <DealRfpLotsSection lots={data.tenderLots} />
    case 'eignung':
      return <DealRfpEligibilitySection data={data} />
    case 'risiken':
      return (
        <DealRfpRisksSection
          entries={riskEntries}
          visible={data.hasAnalysis && !data.isStale && Boolean(data.risks)}
        />
      )
    case 'entwuerfe':
      return data.hasAnalysis && !data.isStale ? (
        <DealRfpDraftsSection rows={data.draftRows} />
      ) : null
  }
}
