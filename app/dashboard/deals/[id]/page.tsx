import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { getDealWithReferences, getReferencesForOrg } from '../actions'
import { DealDetailContent } from '../deal-detail-content'
import { RfpSidebarPanel } from '../rfp-sidebar-panel'
import type { DealStatus } from '../types'

export const dynamic = 'force-dynamic'

function DealStatusBadge({ status }: { status: DealStatus }) {
  const s = status
  const label =
    s === 'open'
      ? 'OPEN'
      : s === 'rfp'
        ? 'RFP'
        : s === 'negotiation'
          ? 'NEGOTIATION'
          : s === 'won'
            ? 'WON'
            : s === 'lost'
              ? 'LOST'
              : s === 'withdrawn'
                ? 'ZURÜCKGEZOGEN'
                : 'ARCHIVED'
  const variant =
    s === 'won'
      ? 'secondary'
      : s === 'lost' || s === 'withdrawn'
        ? 'destructive'
        : 'outline'
  return <Badge variant={variant as any}>{label}</Badge>
}

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
  if (!user) redirect('/login')

  const deal = await getDealWithReferences(id)
  if (!deal) notFound()

  const allReferences = await getReferencesForOrg()

  const { data: events } = await supabase
    .from('evidence_events')
    .select('id, event_type, payload, created_at')
    .eq('deal_id', id)
    .order('created_at', { ascending: false })
    .limit(25)

  const activities =
    (events ?? []).map((e: any) => ({
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
    })) ?? []

  return (
    <div className="px-6 pt-6 md:px-12 lg:px-20 pb-10">
      <div className="mb-6">
        <nav className="text-sm text-muted-foreground">
          <Link href="/dashboard/deals" className="hover:underline">
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
              <p className="text-sm text-muted-foreground">
                {deal.company_name ?? '—'} {deal.industry ? `· ${deal.industry}` : ''}
              </p>
              {deal.volume ? (
                <p className="text-sm text-muted-foreground">Volumen: {deal.volume}</p>
              ) : null}
            </div>
          </div>

          <DealDetailContent deal={deal} allReferences={allReferences} activities={activities} />
        </div>

        <div className="lg:sticky lg:top-6 space-y-4 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal-Metadaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium truncate max-w-[220px]">{deal.company_name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Account Manager</span>
                <span className="font-medium truncate max-w-[220px]">{deal.account_manager_name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Sales Manager</span>
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

          <RfpSidebarPanel dealId={deal.id} />
        </div>
      </div>
    </div>
  )
}
