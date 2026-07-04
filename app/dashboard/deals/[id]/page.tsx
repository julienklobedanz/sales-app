import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'

import { getDealWithReferences } from '../actions'
import { DealCockpitClient } from '../cockpit/deal-cockpit-client'
import { DealRfpCockpitBlock } from '../cockpit/deal-rfp-cockpit-block'
import { DealRfpCockpitSkeleton } from '../cockpit/deal-rfp-cockpit-skeleton'
import type { DealActivityItem } from '../cockpit/deal-activity-card'
import { listDealDeadlines } from '@/lib/deals/deadlines'

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealDetailPageContent params={params} />
    </Suspense>
  )
}

async function DealDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id ?? null
  if (!orgId) redirect(ROUTES.onboarding)

  const supabase = await createServerSupabaseClient()

  const deal = await getDealWithReferences(id)
  if (!deal) notFound()

  const deadlines = await listDealDeadlines(supabase, id)

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
    .order('created_at', { ascending: false })
    .limit(25)

  type EvidenceEventRow = {
    id: string
    event_type: string
    payload: { helped?: boolean; comment?: unknown } | null
    created_at: string
  }

  const activities: DealActivityItem[] = [
    {
      id: 'deal-created',
      at: new Date(deal.created_at),
      title: 'Deal erstellt',
      detail: 'Der Deal wurde angelegt.',
    },
    ...((events ?? []) as EvidenceEventRow[]).map((e) => ({
      id: String(e.id),
      at: new Date(String(e.created_at)),
      title:
        e.event_type === 'reference_helped'
          ? (e.payload?.helped ? 'Referenz hat geholfen' : 'Referenz hat nicht geholfen')
          : e.event_type === 'deal_won'
            ? 'Deal gewonnen'
            : e.event_type === 'deal_lost'
              ? 'Deal verloren'
              : e.event_type === 'deal_withdrawn'
                ? 'Deal zurückgezogen'
                : String(e.event_type),
      detail: e.payload?.comment ? String(e.payload.comment) : '',
    })),
  ]

  return (
    <DealCockpitClient
      deal={deal}
      activities={activities}
      deadlines={deadlines}
      rfpBlock={
        deal.is_rfp_mode ? (
          <Suspense fallback={<DealRfpCockpitSkeleton />}>
            <DealRfpCockpitBlock
              dealId={id}
              orgId={orgId}
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
    />
  )
}
