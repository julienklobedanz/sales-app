'use client'

import Link from 'next/link'
import { useMemo, useTransition } from 'react'
import { toast } from 'sonner'
import { GalleryHorizontalEndIcon, LinkIcon, SearchIcon, UploadIcon } from '@hugeicons/core-free-icons'
import { createSharedPortfolio } from '@/app/dashboard/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import type { SalesRepDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'
import { useCommandPalette } from '@/hooks/useCommandPalette'

export function SalesRepDashboard({ data }: { data: SalesRepDashboardModel }) {
  const { greetingName, activeDeals, recommended, recommendedNote, recentShares } = data
  const { setOpen: setCommandPaletteOpen } = useCommandPalette()
  const [isPending, startTransition] = useTransition()
  const isMacLike = useMemo(() => {
    if (typeof navigator === 'undefined') return true
    const ua = navigator.userAgent.toLowerCase()
    return /mac|iphone|ipad|ipod/.test(ua)
  }, [])
  const shortcutLabel = isMacLike ? 'CMD + K' : 'CTRL + K'

  function handleQuickShare(referenceId: string | null) {
    if (!referenceId) {
      toast.info('Kein verknuepfter Referenz-Match vorhanden.')
      return
    }
    startTransition(async () => {
      const result = await createSharedPortfolio([referenceId])
      if (!result.success) {
        toast.error(result.error ?? 'Link konnte nicht erstellt werden.')
        return
      }
      await navigator.clipboard.writeText(result.url)
      toast.success('Quick Share Link erstellt und kopiert.')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="h-[62px]" aria-hidden />

      <button
        type="button"
        className="relative flex h-16 w-full items-center rounded-2xl border border-border/70 bg-background/90 pl-12 pr-24 text-left text-lg text-muted-foreground shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:shadow-[0_0_0_1px_rgba(59,130,246,0.24),0_10px_36px_rgba(59,130,246,0.18)] dark:bg-card/85 dark:shadow-[0_12px_36px_rgba(2,6,23,0.45)]"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <AppIcon icon={SearchIcon} size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        Durchsuche Deals, Accounts und Referenzen ...
        <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {shortcutLabel}
        </span>
      </button>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deine nächsten Schritte</p>
          <CardTitle className="text-base tracking-tight">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={ROUTES.match}
              className="group flex min-h-[128px] flex-col rounded-xl border border-blue-600/20 bg-gradient-to-b from-blue-600 to-blue-700 p-4 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-transform hover:-translate-y-0.5"
            >
              <AppIcon icon={SearchIcon} size={18} />
              <p className="mt-2 text-sm font-semibold tracking-tight">Match starten</p>
              <p className="mt-1 text-xs text-blue-100/90">Neue Referenztreffer fuer aktive Deals</p>
            </Link>
            <Link
              href={ROUTES.marketSignals}
              className="group flex min-h-[128px] flex-col rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <AppIcon icon={UploadIcon} size={18} className="text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">RFP / Marktsignale</p>
              <p className="mt-1 text-xs text-muted-foreground">Proaktive Trigger fuer deinen Pipeline-Fokus</p>
            </Link>
            <Link
              href={ROUTES.deals.requestNew}
              className="group flex min-h-[128px] flex-col rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <AppIcon icon={LinkIcon} size={18} className="text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">Referenz-Anfrage</p>
              <p className="mt-1 text-xs text-muted-foreground">Direkt den passenden Kundenbeleg anfordern</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-base tracking-tight">Deine aktiven Deals</CardTitle>
          <CardDescription>
            Status offen, RFP oder Verhandlung; dir als Sales zugeordnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/35 px-6 py-12 text-center">
              <div className="mb-4 grid w-full max-w-sm grid-cols-5 gap-1.5 opacity-60">
                <div className="h-3 rounded-full bg-muted-foreground/35" />
                <div className="h-3 rounded-full bg-muted-foreground/30" />
                <div className="h-3 rounded-full bg-muted-foreground/25" />
                <div className="h-3 rounded-full bg-muted-foreground/20" />
                <div className="h-3 rounded-full bg-muted-foreground/15" />
              </div>
              <p className="text-base font-semibold tracking-tight text-foreground">Noch keine aktiven Deals synchronisiert</p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Lass uns Deals gewinnen, {greetingName || 'du'}. Verknüpfe deine aktive Salesforce-Pipeline, um hier Live-Referenzmatches in Echtzeit zu sehen.
              </p>
              <Button
                type="button"
                className="mt-4 rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
                onClick={() => toast.info('CRM-Connect folgt im naechsten Schritt.')}
              >
                Salesforce / HubSpot verbinden
              </Button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {activeDeals.map((d) => (
                <li key={d.id}>
                  <Link
                    href={ROUTES.deals.detail(d.id)}
                    className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium leading-snug line-clamp-2">{d.title}</span>
                        {d.bestMatchScore && d.bestMatchScore > 0.65 ? (
                          <Badge className="ml-0 mt-1 inline-flex bg-blue-600/10 text-blue-600 border-0 shadow-[0_0_0_1px_rgba(37,99,235,0.2)]">
                            AI Match
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <DealStatusBadge status={d.status} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault()
                            handleQuickShare(d.quickShareReferenceId)
                          }}
                        >
                          Quick Share
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.company_name ?? '—'}
                      {d.volume?.trim() ? ` · ${d.volume.trim()}` : ''}
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

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-base tracking-tight">Empfohlen für dich</CardTitle>
          <CardDescription>
            Automatischer Abgleich anhand deines ersten aktiven Deals (Match-Engine).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendedNote ? (
            <p className="text-sm text-muted-foreground">{recommendedNote}</p>
          ) : recommended.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/35 px-3 py-2.5">
                  <span className="size-6 rounded-md bg-muted-foreground/25" />
                  <span className="h-3 w-52 rounded bg-muted-foreground/25" />
                </div>
              ))}
            </div>
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Why?</span> Used by Team to close a similar deal.
                    </p>
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

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2.5">
          <CardTitle className="text-base tracking-tight flex items-center gap-2">
            <AppIcon icon={GalleryHorizontalEndIcon} size={18} className="text-muted-foreground" />
            Kürzlich geteilte Links
          </CardTitle>
          <CardDescription>Letzte Kundenlinks, die du erstellt hast (Audit-Log).</CardDescription>
        </CardHeader>
        <CardContent>
          {recentShares.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/35 px-3 py-2.5">
                  <span className="h-3 w-24 rounded bg-muted-foreground/25" />
                  <span className="h-3 w-36 rounded bg-muted-foreground/25" />
                </div>
              ))}
            </div>
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
