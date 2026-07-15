import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'

import { getDealWithReferences } from '../actions'
import { listDealDocuments } from '../document-actions'
import { DealCockpitClient } from '../cockpit/deal-cockpit-client'
import { DealRfpCockpitBlock } from '../cockpit/deal-rfp-cockpit-block'
import { DealRfpCockpitSkeleton } from '../cockpit/deal-rfp-cockpit-skeleton'
import { DealCockpitBriefingTrigger } from '../cockpit/deal-cockpit-briefing-trigger'
import type { DealActivityItem } from '../cockpit/deal-activity-card'
import {
  DEAL_ACTIVITY_VISIBLE_EVENT_TYPES,
  mapEvidenceEventsToDealActivities,
  sortDealActivitiesNewestFirst,
  type DealActivityEvidenceRow,
} from '@/lib/deals/deal-activity-events'
import { getHubSpotPortalIdForOrganization } from '@/lib/crm/connections'
import { listDealDeadlines } from '@/lib/deals/deadlines'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'

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
  const hubspotPortalId = await getHubSpotPortalIdForOrganization(supabase, orgId)

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
    functionRole
  )
  const documentsResult = await listDealDocuments(id)
  const documents = documentsResult.success ? documentsResult.rows : []

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

  const { data: events } = await supabase
    .from('evidence_events')
    .select('id, event_type, payload, created_at')
    .eq('deal_id', id)
    .in('event_type', [...DEAL_ACTIVITY_VISIBLE_EVENT_TYPES])
    .order('created_at', { ascending: false })
    .limit(25)

  const activities: DealActivityItem[] = sortDealActivitiesNewestFirst([
    {
      id: 'deal-created',
      at: new Date(deal.created_at),
      title: 'Deal erstellt',
      detail: 'Der Deal wurde angelegt.',
    },
    ...mapEvidenceEventsToDealActivities((events ?? []) as DealActivityEvidenceRow[]),
  ])

  return (
    <DealCockpitClient
      deal={deal}
      activities={activities}
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
      rfpBlock={
        deal.is_rfp_mode ? (
          <Suspense fallback={<DealRfpCockpitSkeleton />}>
            <DealRfpCockpitBlock
              dealId={id}
              orgId={orgId}
              deal={deal}
              documents={documents}
              canManageDocuments={canManageDocuments}
              dealContext={{
                title: deal.title,
                industry: deal.industry,
                volume: deal.volume,
              }}
            />
          </Suspense>
        ) : undefined
      }
      companies={(companies ?? []) as Array<{ id: string; name: string }>}
      orgProfiles={(orgProfiles ?? []) as Array<{ id: string; full_name: string | null }>}
      hubspotPortalId={hubspotPortalId}
      orgDateDisplayFormat={orgDateDisplayFormat}
    />
  )
}
