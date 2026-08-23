import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'
import { buildDealAusschreibungSummary } from '@/lib/deals/deal-ausschreibung-summary'
import { isRfpDeal } from '@/lib/deals/is-rfp-deal'
import { loadDealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import { getDealWithReferences } from '../actions'
import { listDealDocuments } from '../document-actions'
import { DealCockpitClient } from '../cockpit/deal-cockpit-client'
import { DealCockpitBriefingTrigger } from '../cockpit/deal-cockpit-briefing-trigger'
import { DealAusschreibungSummaryCard } from '../cockpit/deal-ausschreibung-summary-card'
import { DealRfpRecommendationBanner } from '../cockpit/deal-rfp-recommendation-banner'
import { listDealDeadlines } from '@/lib/deals/deadlines'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { suggestDealReferenceMatches } from '@/lib/deals/suggest-deal-reference-matches'

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

  const deadlines = await listDealDeadlines(supabase, id)

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
  const documentsResult = await listDealDocuments(id)
  const documents = documentsResult.success ? documentsResult.rows : []

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
  const showVerdict = Boolean(rfpData?.hasAnalysis)
  const summary = isRfpDeal(deal)
    ? buildDealAusschreibungSummary({ documentCount: documents.length, data: rfpData })
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
        showVerdict && rfpData ? (
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
      ausschreibungSummary={
        summary ? <DealAusschreibungSummaryCard dealId={id} summary={summary} /> : null
      }
      companies={(companies ?? []) as Array<{ id: string; name: string }>}
      orgProfiles={(orgProfiles ?? []) as Array<{ id: string; full_name: string | null }>}
      orgDateDisplayFormat={orgDateDisplayFormat}
      initialReferenceSuggestions={initialReferenceSuggestions}
    />
  )
}
