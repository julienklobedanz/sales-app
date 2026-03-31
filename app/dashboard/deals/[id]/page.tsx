import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { getDealWithReferences, getReferencesForOrg } from '../actions'
import { DealDetailContent } from '../deal-detail-content'
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
              <div className="flex flex-wrap items-center gap-2">
                <DealStatusBadge status={deal.status} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight break-words">{deal.title}</h1>
              <p className="text-sm text-muted-foreground">
                {deal.company_name ?? '—'} {deal.industry ? `· ${deal.industry}` : ''}
              </p>
              {deal.volume ? (
                <p className="text-sm text-muted-foreground">Volumen: {deal.volume}</p>
              ) : null}
            </div>
          </div>

          <DealDetailContent deal={deal} allReferences={allReferences} />
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
                <span className="text-muted-foreground">Ablaufdatum</span>
                <span className="font-medium">{deal.expiry_date ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Erstellt</span>
                <span className="font-medium">{new Date(deal.created_at).toLocaleDateString('de-DE')}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Geändert</span>
                <span className="font-medium">
                  {deal.updated_at ? new Date(deal.updated_at).toLocaleDateString('de-DE') : '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
