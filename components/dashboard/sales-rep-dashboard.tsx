import Link from 'next/link'
import { GalleryHorizontalEndIcon, LinkIcon, SearchIcon, UploadIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import type { SalesRepDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'

export function SalesRepDashboard({ data }: { data: SalesRepDashboardModel }) {
  const { greetingName, activeDeals, recommended, recommendedNote, recentShares } = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Willkommen zurück{greetingName ? `, ${greetingName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dein Überblick: aktive Deals, passende Referenzen und zuletzt geteilte Links.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Suche &amp; Aktionen</CardTitle>
          <CardDescription>
            Schnell zur semantischen Suche oder typischen nächsten Schritten.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild variant="default" className="gap-2">
            <Link href={ROUTES.match}>
              <AppIcon icon={SearchIcon} size={18} />
              Match starten
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={ROUTES.marketSignals}>
              <AppIcon icon={UploadIcon} size={18} />
              RFP / Marktsignale
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={ROUTES.deals.requestNew}>
              <AppIcon icon={LinkIcon} size={18} />
              Referenz-Anfrage
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deine aktiven Deals</CardTitle>
          <CardDescription>
            Status offen, RFP oder Verhandlung; dir als Sales zugeordnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine aktiven Deals.{' '}
              <Link href={ROUTES.deals.root} className="text-primary underline underline-offset-4">
                Zu den Deals
              </Link>
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {activeDeals.map((d) => (
                <li key={d.id}>
                  <Link
                    href={ROUTES.deals.detail(d.id)}
                    className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug line-clamp-2">{d.title}</span>
                      <DealStatusBadge status={d.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.company_name ?? '—'}
                      {d.expiry_date ? ` · bis ${formatDateUtcDe(d.expiry_date)}` : ''}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {d.linkedCount} verknüpfte Referenz{d.linkedCount === 1 ? '' : 'en'}
                      {typeof d.bestMatchScore === 'number' && !Number.isNaN(d.bestMatchScore) ? (
                        <>
                          {' '}
                          · Bester Score {(d.bestMatchScore * 100).toFixed(0)} %
                        </>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empfohlene Referenzen</CardTitle>
          <CardDescription>
            Automatischer Abgleich anhand deines ersten aktiven Deals (Match-Engine).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendedNote ? (
            <p className="text-sm text-muted-foreground">{recommendedNote}</p>
          ) : recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Treffer für die aktuelle Auswahl.</p>
          ) : (
            <ul className="space-y-3">
              {recommended.map((m) => (
                <li key={m.id} className="flex flex-col gap-1 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      href={ROUTES.evidence.detail(m.id)}
                      className="font-medium text-foreground hover:underline"
                    >
                      {m.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.snippet}</p>
                  </div>
                  <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    Score {(m.similarity * 100).toFixed(0)}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AppIcon icon={GalleryHorizontalEndIcon} size={18} className="text-muted-foreground" />
            Kürzlich geteilte Links
          </CardTitle>
          <CardDescription>Letzte Kundenlinks, die du erstellt hast (Audit-Log).</CardDescription>
        </CardHeader>
        <CardContent>
          {recentShares.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentShares.map((row, i) => (
                <li key={`${row.created_at}-${i}`} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">
                    {formatDateUtcDe(row.created_at)}
                  </span>
                  {row.slug ? (
                    <Link
                      href={ROUTES.publicReference(row.slug)}
                      className="truncate font-medium text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      /p/{row.slug}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Persönliche Impact-KPIs (Matches, Umsatz) sind für eine spätere Ausbaustufe vorgesehen.
      </p>
    </div>
  )
}
