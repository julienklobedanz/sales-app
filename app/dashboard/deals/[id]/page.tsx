import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { getDealWithReferences, getReferencesForOrg } from '../actions'
import { DealDetailContent } from '../deal-detail-content'
import { RfpSidebarPanel } from '../rfp-sidebar-panel'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: me } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = (me as { organization_id?: string | null })?.organization_id ?? null
  if (!orgId) redirect(ROUTES.onboarding)

  const deal = await getDealWithReferences(id)
  if (!deal) notFound()

  const allReferences = await getReferencesForOrg()

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

  const activities = [
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
    <div>
      <div className="mb-6">
        <nav className="text-sm text-muted-foreground">
          <Link href={ROUTES.deals.root} className="hover:underline">
            Deals
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{deal.title}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight break-words flex flex-wrap items-center gap-2">
                <span>{deal.title}</span>
                <DealStatusBadge status={deal.status} />
              </h1>
              {deal.industry ? (
                <p className="text-sm text-muted-foreground">{deal.industry}</p>
              ) : null}
            </div>
          </div>

          <DealDetailContent deal={deal} allReferences={allReferences} activities={activities} />
        </div>

        <div className="lg:sticky lg:top-6 space-y-4 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium truncate max-w-[220px]">{deal.company_name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{COPY.roles.accountManager}</span>
                <span className="font-medium truncate max-w-[220px]">{deal.account_manager_name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{COPY.roles.salesManager}</span>
                <span className="font-medium truncate max-w-[220px]">{deal.sales_manager_name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Volumen</span>
                <span className="font-medium truncate max-w-[220px]">{deal.volume ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ablaufdatum</span>
                <span className="font-medium">{deal.expiry_date ?? '—'}</span>
              </div>
            </CardContent>
          </Card>

          <RfpSidebarPanel
            deal={deal}
            companies={(companies ?? []) as Array<{ id: string; name: string }>}
            orgProfiles={(orgProfiles ?? []) as Array<{ id: string; full_name: string | null }>}
            allReferences={allReferences}
          />
        </div>
      </div>
    </div>
  )
}
