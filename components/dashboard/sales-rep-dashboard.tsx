'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import type { SalesRepDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'

export function SalesRepDashboard({ data }: { data: SalesRepDashboardModel }) {
  const { activeDeals, recommended, recommendedNote, recentShares } = data

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-8">
      <p className="text-sm text-muted-foreground">
        Welche Referenz passt zu deinem nächsten Kundengespräch?
      </p>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aktive Deals</CardTitle>
          <CardDescription>Match-Status und verknüpfte Referenzen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine aktiven Deals zugewiesen.</p>
          ) : (
            activeDeals.slice(0, 6).map((deal) => (
              <div
                key={deal.id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link href={ROUTES.deals.detail(deal.id)} className="font-medium hover:underline">
                    {deal.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {deal.company_name ?? '—'}
                    {deal.bestMatchScore != null
                      ? ` · Match ${Math.round(deal.bestMatchScore * 100)} %`
                      : ''}
                    {deal.linkedCount > 0 ? ` · ${deal.linkedCount} Referenz(en)` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {deal.recentSignalCount > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {deal.recentSignalCount} Signal{deal.recentSignalCount === 1 ? '' : 'e'}
                    </Badge>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={
                        deal.quickShareReferenceId
                          ? ROUTES.references.detail(deal.quickShareReferenceId)
                          : ROUTES.matchWithDeal(deal.id)
                      }
                    >
                      Beweis finden
                    </Link>
                  </Button>
                  {deal.company_id ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={ROUTES.accountsDetail(deal.company_id)}>Account</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Empfohlene Referenzen</CardTitle>
          <CardDescription>Semantische Treffer zum primären Deal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {recommendedNote ?? 'Noch keine Empfehlungen verfügbar.'}
            </p>
          ) : (
            recommended.slice(0, 5).map((ref) => (
              <Link
                key={ref.id}
                href={ROUTES.references.detail(ref.id)}
                className="block rounded-md border border-border/70 px-3 py-2 hover:bg-muted/40"
              >
                <p className="text-sm font-medium">{ref.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{ref.snippet}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Relevanz {Math.round(ref.similarity * 100)} %
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kürzlich geteilt</CardTitle>
          <CardDescription>Deine letzten Share-Links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentShares.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Shares in den letzten Wochen.</p>
          ) : (
            recentShares.slice(0, 5).map((row, idx) => (
              <div
                key={`${row.created_at}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0 truncate">
                  <span className="font-medium">{row.reference_title ?? 'Referenz'}</span>
                  {row.account_name ? (
                    <span className="text-muted-foreground"> · {row.account_name}</span>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateUtcDe(row.created_at)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
