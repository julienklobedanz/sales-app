import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'
import { buildDealWorkspaceTiles } from '@/lib/deals/build-deal-workspace-tiles'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import { loadDealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import { listDealDeadlines, listTenderDeadlines } from '@/lib/deals/deadlines'
import { mergeLotAndTenderDeadlines } from '@/lib/deals/deadline-display'
import { mergeLotAndTenderDocuments } from '@/lib/deals/document-display'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { suggestDealReferenceMatches } from '@/lib/deals/suggest-deal-reference-matches'

import { getDealWithReferences } from '../actions'
import { DealCockpitClient } from '../cockpit/deal-cockpit-client'
import { DealCockpitBriefingTrigger } from '../cockpit/deal-cockpit-briefing-trigger'
import { DealWorkspaceTiles } from '../cockpit/deal-workspace-tiles'
import { DealRfpFactsSurface } from '../cockpit/deal-rfp-facts-surface'
import { DealRfpRecommendationBanner } from '../cockpit/deal-rfp-recommendation-banner'
import { listDealDocuments, listTenderDocuments } from '../document-actions'

export default function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealDetailPageContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function DealDetailPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  if (sp.tab === 'desk') {
    redirect(ROUTES.deals.detailRfp(id))
  }

  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id ?? null
  if (!orgId) redirect(ROUTES.onboarding)

  const supabase = await createServerSupabaseClient()

  const deal = await getDealWithReferences(id)
  if (!deal) notFound()

  const [lotDeadlines, tenderDeadlines] = await Promise.all([
    listDealDeadlines(supabase, id),
    deal.tender_id ? listTenderDeadlines(supabase, deal.tender_id) : Promise.resolve([]),
  ])
  const deadlines = mergeLotAndTenderDeadlines(lotDeadlines, tenderDeadlines)

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('date_display_format')
    .eq('id', orgId)
    .maybeSingle()
  const orgDateDisplayFormat = normalizeOrgDateDisplayFormat(orgRow?.date_display_format)

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const canManageDocuments = canManageDealDocuments(
    {
      sales_manager_id: deal.sales_manager_id,
      account_manager_id: deal.account_manager_id,
    },
    user.id,
    systemRole,
    functionRole,
  )
  const [documentsResult, tenderDocumentsResult] = await Promise.all([
    listDealDocuments(id),
    deal.tender_id
      ? listTenderDocuments(deal.tender_id)
      : Promise.resolve({ success: true as const, rows: [] }),
  ])
  const documents = mergeLotAndTenderDocuments(
    documentsResult.success ? documentsResult.rows : [],
    tenderDocumentsResult.success ? tenderDocumentsResult.rows : [],
  )

  const { suggestions: initialReferenceSuggestions } =
    documents.length > 0 ? await suggestDealReferenceMatches(id) : { suggestions: [] }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  const { data: orgProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('organization_id', orgId)
    .order('full_name')

  const rfpData = isRfpDeal(deal)
    ? await loadDealRfpCockpitData(supabase, orgId, id, {
        title: deal.title,
        industry: deal.industry,
        volume: deal.volume,
      })
    : null
  const analysisLive = Boolean(rfpData?.hasAnalysis && !rfpData.isStale)
  const workspaceTiles = isRfpDeal(deal)
    ? buildDealWorkspaceTiles({
        dealId: id,
        documentCount: documents.length,
        data: rfpData
          ? {
              hasAnalysis: rfpData.hasAnalysis,
              isStale: rfpData.isStale,
              eligibilityAssessment: rfpData.eligibilityAssessment,
              draftRows: rfpData.draftRows,
              requirementsCount: rfpData.requirementsCount,
            }
          : null,
      })
    : null

  return (
    <DealCockpitClient
      deal={deal}
      deadlines={deadlines}
      documents={documents}
      canManageDocuments={canManageDocuments}
      briefingButton={
        deal.is_rfp_mode ? (
          <Suspense fallback={null}>
            <DealCockpitBriefingTrigger dealId={id} orgId={orgId} />
          </Suspense>
        ) : undefined
      }
      verdict={
        analysisLive && rfpData ? (
          <div className="mb-6">
            <DealRfpRecommendationBanner
              data={rfpData}
              dealId={id}
              documents={documents}
              canManage={canManageDocuments}
              showEngineMetrics={false}
            />
          </div>
        ) : null
      }
      workspaceTiles={
        workspaceTiles ? <DealWorkspaceTiles tiles={workspaceTiles} /> : null
      }
      rfpFacts={
        analysisLive && rfpData ? (
          <DealRfpFactsSurface rows={rfpData.stammdatenRows} lots={rfpData.tenderLots} />
        ) : null
      }
      companies={(companies ?? []) as Array<{ id: string; name: string }>}
      orgProfiles={(orgProfiles ?? []) as Array<{ id: string; full_name: string | null }>}
      orgDateDisplayFormat={orgDateDisplayFormat}
      initialReferenceSuggestions={initialReferenceSuggestions}
    />
  )
}
