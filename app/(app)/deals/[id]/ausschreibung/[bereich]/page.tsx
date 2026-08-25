import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import {
  isDealWorkspaceArea,
  isDealWorkspaceEntryArea,
  type DealWorkspaceArea,
} from '@/lib/deals/deal-workspace-areas'
import { loadDealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { loadDealRfpRequirements } from '@/lib/deals/load-deal-rfp-requirements'
import { buildAusschreibungNavItems } from '@/lib/deals/build-ausschreibung-nav-items'
import { buildDealWorkspaceRiskEntries } from '@/lib/deals/deal-workspace-risk-entry'
import { draftRowStatus } from '@/lib/deals/sort-draft-rows-by-criticality'

import { DealRfpCockpitSkeleton } from '../../../cockpit/deal-rfp-cockpit-skeleton'
import { DealWorkspaceLayout } from '../../../cockpit/deal-workspace-layout'
import { DealWorkspaceAreaContent } from '../../../cockpit/deal-workspace-area-content'
import { DealRisksEntryPanel } from '../../../cockpit/deal-risks-entry-panel'
import { DealDraftsEntryPanel } from '../../../cockpit/deal-drafts-entry-panel'
import { DealRequirementsEntryPanel } from '../../../cockpit/deal-requirements-entry-panel'
import { loadDealWorkspaceContext } from '../load-deal-workspace-context'

export default function DealWorkspaceAreaPage({
  params,
}: {
  params: Promise<{ id: string; bereich: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealWorkspaceAreaPageContent params={params} />
    </Suspense>
  )
}

async function DealWorkspaceAreaPageContent({
  params,
}: {
  params: Promise<{ id: string; bereich: string }>
}) {
  const { id, bereich } = await params
  if (!isDealWorkspaceArea(bereich)) notFound()

  const { orgId, deal, canManageDocuments, documents } =
    await loadDealWorkspaceContext(id)

  return (
    <Suspense fallback={<DealRfpCockpitSkeleton />}>
      <DealWorkspaceAreaLoaded
        dealId={id}
        orgId={orgId}
        deal={deal}
        documents={documents}
        canManageDocuments={canManageDocuments}
        area={bereich}
      />
    </Suspense>
  )
}

async function DealWorkspaceAreaLoaded({
  dealId,
  orgId,
  deal,
  documents,
  canManageDocuments,
  area,
}: {
  dealId: string
  orgId: string
  deal: Awaited<ReturnType<typeof loadDealWorkspaceContext>>['deal']
  documents: Awaited<ReturnType<typeof loadDealWorkspaceContext>>['documents']
  canManageDocuments: boolean
  area: DealWorkspaceArea
}) {
  const supabase = await createServerSupabaseClient()
  const [data, requirements] = await Promise.all([
    loadDealRfpCockpitData(supabase, orgId, dealId, {
      title: deal.title,
      industry: deal.industry,
      volume: deal.volume,
    }),
    loadDealRfpRequirements(supabase, {
      dealId,
      organizationId: orgId,
      documents: documents.map((doc) => ({ id: doc.id, file_name: doc.file_name })),
    }),
  ])

  // Leiste zählt bereit/gesamt — sonst bleibt die Zahl beim Speichern stehen.
  const draftsCovered = data
    ? data.draftRows.filter((row) => draftRowStatus(row) === 'ready').length
    : 0
  const risksCount = data?.risks ? data.risks.redFlags.length : 0

  const analysisLive = Boolean(data?.hasAnalysis && !data?.isStale)
  const riskEntries =
    data && analysisLive
      ? buildDealWorkspaceRiskEntries({
          redFlags: data.risks?.redFlags ?? [],
        })
      : []
  const draftRows = data && analysisLive ? data.draftRows : []
  const entries =
    area === 'risiken'
      ? riskEntries
      : area === 'entwuerfe'
        ? draftRows
        : area === 'anforderungen'
          ? requirements
          : []
  const panel =
    area === 'risiken' ? (
      <DealRisksEntryPanel entries={riskEntries} />
    ) : area === 'entwuerfe' ? (
      <DealDraftsEntryPanel rows={draftRows} deal={deal} />
    ) : area === 'anforderungen' ? (
      <DealRequirementsEntryPanel requirements={requirements} />
    ) : undefined

  return (
    <DealWorkspaceLayout
      dealId={dealId}
      dealTitle={deal.title}
      currentArea={area}
      entries={
        isDealWorkspaceEntryArea(area) ? entries.map((entry) => ({ id: entry.id })) : []
      }
      panel={panel}
      items={buildAusschreibungNavItems({
        dealId,
        documentCount: documents.length,
        stammdatenCount: data?.stammdatenRows.length ?? 0,
        eligibilityCount: data?.eligibilityAssessment?.criteria.length ?? 0,
        risksCount,
        draftsCovered,
        draftsTotal: data?.draftRows.length ?? 0,
        requirementsCount: requirements.length,
        showAnalysisLinks: Boolean(data),
      })}
    >
      <DealWorkspaceAreaContent
        area={area}
        dealId={dealId}
        deal={deal}
        documents={documents}
        canManageDocuments={canManageDocuments}
        data={data}
        riskEntries={riskEntries}
        requirements={requirements}
        requestedEvidenceGaps={analysisLive ? (data?.requestedEvidenceGaps ?? []) : []}
        smeGroups={analysisLive ? (data?.risks?.smeGroups ?? []) : []}
      />
    </DealWorkspaceLayout>
  )
}
