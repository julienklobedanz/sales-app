'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { BellRing, Building2, CalendarClock, ChevronRight, Flame, Mail, Search, Target, TrendingUp, UserRound } from 'lucide-react'
import { logMarketSignalQuickAction } from '@/app/dashboard/market-signals/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import type { SalesRepDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'
import { useCommandPalette } from '@/hooks/useCommandPalette'

export function SalesRepDashboard({ data }: { data: SalesRepDashboardModel }) {
  const { dailyTopActions, liveIntent, pipelineImpact, strategicAccounts, snoozedSignalsCount } = data
  const { setOpen: setCommandPaletteOpen } = useCommandPalette()
  const [isPending, startTransition] = useTransition()
  const isMacLike = useMemo(() => {
    if (typeof navigator === 'undefined') return true
    const ua = navigator.userAgent.toLowerCase()
    return /mac|iphone|ipad|ipod/.test(ua)
  }, [])
  const shortcutLabel = isMacLike ? 'CMD + K' : 'CTRL + K'
  const [nowMs] = useState(() => Date.now())

  function renderDraftText(input: string) {
    return input.split(/(\[[^\]]+\])/g).map((part, idx) => {
      if (/^\[[^\]]+\]$/.test(part)) {
        return (
          <span key={`${part}-${idx}`} className="font-semibold text-blue-700">
            {part}
          </span>
        )
      }
      return <span key={`${part}-${idx}`}>{part}</span>
    })
  }

  function openHubspotDeeplink(subject: string, body: string) {
    const encoded = encodeURIComponent(`${subject}\n\n${body}`)
    window.open(`https://app.hubspot.com/contacts?query=${encoded}`, '_blank', 'noopener,noreferrer')
  }

  function openSalesforceDeeplink(subject: string, body: string) {
    const values = `Subject=${encodeURIComponent(subject)},Description=${encodeURIComponent(body)}`
    window.open(
      `https://login.salesforce.com/lightning/o/Task/new?defaultFieldValues=${values}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  function triggerAction(item: SalesRepDashboardModel['dailyTopActions'][number], channel: 'hubspot_email' | 'salesforce_task' | 'slack_mention') {
    startTransition(async () => {
      const result = await logMarketSignalQuickAction({ signalKey: item.signalKey, channel })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (channel === 'hubspot_email') {
        openHubspotDeeplink(item.draftSubject, item.draftBody)
      } else if (channel === 'salesforce_task') {
        openSalesforceDeeplink(item.draftSubject, item.draftBody)
      } else {
        window.open(ROUTES.marketSignals, '_blank', 'noopener,noreferrer')
      }
      toast.success('Aktion gestartet')
    })
  }

  function relativeTimeLabel(iso: string) {
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return 'gerade'
    const diffMin = Math.max(1, Math.round((nowMs - t) / 60000))
    if (diffMin < 60) return `vor ${diffMin}m`
    const hours = Math.round(diffMin / 60)
    if (hours < 24) return `vor ${hours}h`
    return formatDateUtcDe(iso)
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className="relative flex h-14 w-full items-center rounded-xl border border-border/70 bg-background pl-11 pr-20 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-blue-300/70"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        Durchsuche Deals, Accounts und Referenzen ...
        <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {shortcutLabel}
        </span>
      </button>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">1. Daily Focus</p>
          <CardTitle className="text-lg">Top Actions</CardTitle>
          <CardDescription>{snoozedSignalsCount} Signale aktuell geparkt (Snooze).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {dailyTopActions.map((item) => {
            const levelClass =
              item.level === 'prio'
                ? 'bg-red-500/10 text-red-700 border-red-200'
                : item.level === 'new'
                  ? 'bg-blue-500/10 text-blue-700 border-blue-200'
                  : 'bg-amber-500/10 text-amber-700 border-amber-200'
            return (
              <div key={item.id} className="group flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={levelClass}>
                      {item.level === 'prio' ? 'PRIO' : item.level === 'new' ? 'NEW' : 'BACK'}
                    </Badge>
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      triggerAction(
                        item,
                        item.ctaLabel === 'Draft Outreach'
                          ? 'hubspot_email'
                          : item.ctaLabel === 'Referenz teilen'
                            ? 'salesforce_task'
                            : 'slack_mention'
                      )
                    }
                  >
                    {item.ctaLabel}
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">2. Real-Time Intent</p>
            <CardTitle className="text-lg">Live Intent Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {liveIntent.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Noch keine Live-Intent Events.
                </li>
              ) : (
                liveIntent.map((event) => (
                  <li key={event.id} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex size-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <div className="min-w-0 flex-1 rounded-md border border-border/70 px-3 py-2.5">
                      <p className="text-sm text-foreground">{event.text}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">{relativeTimeLabel(event.createdAt)}</p>
                        {event.href ? (
                          <Link href={event.href} className="text-xs font-medium text-blue-700 hover:underline">
                            Öffnen
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">3. My Pipeline Impact</p>
            <CardTitle className="text-lg">Wochenziel-Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ['Outreach', pipelineImpact.outreachDone, pipelineImpact.outreachTarget, <Mail key="mail" className="h-4 w-4 text-blue-600" />],
              ['Meetings', pipelineImpact.meetingsDone, pipelineImpact.meetingsTarget, <CalendarClock key="calendar" className="h-4 w-4 text-amber-600" />],
              ['Opps', pipelineImpact.opportunitiesDone, pipelineImpact.opportunitiesTarget, <Target key="target" className="h-4 w-4 text-emerald-600" />],
            ] as const).map(([label, done, target, icon]) => {
              const pct = Math.max(0, Math.min(100, Math.round((done / Math.max(target, 1)) * 100)))
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      {icon}
                      {label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {done}/{target}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">Win-Rate:</span>{' '}
              <span className="tabular-nums">{pipelineImpact.winRatePercent}%</span>{' '}
              <span className="text-emerald-600">(+{pipelineImpact.winRateDeltaPercent}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">4. Strategic Accounts</p>
          <CardTitle className="text-lg">Bridge: Signal ↔ MEDDPICC</CardTitle>
          <CardDescription>Konten mit Signalen und strategischen Lücken für den nächsten Schritt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {strategicAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Keine strategischen Accounts mit Handlungsbedarf.
            </div>
          ) : (
            strategicAccounts.map((row) => (
              <Link
                key={row.companyId}
                href={row.href}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {row.companyName}
                    </span>
                    <span className="text-xs text-muted-foreground">{row.signalCount24h} neue Signale</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-foreground leading-relaxed">
                    {renderDraftText(row.signalSummary)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.meddpiccGap}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="secondary">{row.actionLabel}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
