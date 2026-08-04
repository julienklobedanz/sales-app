'use client'

import Link from 'next/link'

import type { GeneralistDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'
import { formatReferenceDate } from '@/lib/format'

export function GeneralistDashboard({ data }: { data: GeneralistDashboardModel }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
      <p className="text-sm text-muted-foreground">{data.leadQuestion}</p>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aktive Deals</CardTitle>
            <CardDescription>Deine offenen Opportunities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.activeDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine aktiven Deals.</p>
            ) : (
              data.activeDeals.slice(0, 5).map((deal) => (
                <Link
                  key={deal.id}
                  href={ROUTES.deals.detail(deal.id)}
                  className="block rounded-md border border-border/70 px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <p className="font-medium">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">{deal.company_name ?? '—'}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ausstehende Freigaben</CardTitle>
            <CardDescription>Kunden-Freigaben in Bearbeitung.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.pendingApprovalsCount === 0 ? (
              <p className="text-sm text-muted-foreground">Keine ausstehenden Freigaben.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.pendingApprovalsPreview.map((p) => (
                  <li key={p.approvalId}>
                    <Link href={ROUTES.references.detail(p.referenceId)} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.companyName}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nutzung (30 Tage)</CardTitle>
            <CardDescription>Workspace-Aktivität aus Events.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md border border-border p-2">
              <div className="text-xs text-muted-foreground">Views</div>
              <div className="text-lg font-semibold tabular-nums">{data.usageTotals.views}</div>
            </div>
            <div className="rounded-md border border-border p-2">
              <div className="text-xs text-muted-foreground">Shares</div>
              <div className="text-lg font-semibold tabular-nums">{data.usageTotals.shares}</div>
            </div>
            <div className="rounded-md border border-border p-2">
              <div className="text-xs text-muted-foreground">Matches</div>
              <div className="text-lg font-semibold tabular-nums">{data.usageTotals.matches}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.recentShares.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kürzlich geteilt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentShares.slice(0, 3).map((row, idx) => (
              <div key={`${row.created_at}-${idx}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{row.reference_title ?? 'Referenz'}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatReferenceDate(row.created_at, 'de-DE')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.deals.root}>Zu Deals</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.references.root}>Zu Referenzen</Link>
        </Button>
      </div>
    </div>
  )
}
