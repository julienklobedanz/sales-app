'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, Gauge, RefreshCw, ServerCog, ShieldAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import type { AdminDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatReferenceDate } from '@/lib/format'

export function AdminDashboard({
  data,
  variant = 'admin',
}: {
  data: AdminDashboardModel
  variant?: 'admin' | 'sales_leader'
}) {
  const { blockers, contentRoi, systemUsage, newsIngestHealth, auditFeed, kpis, kpiTrends, topReferences, pipelineSignals, winRate } = data
  const [nowMs] = useState(() => Date.now())

  const usagePercent = useMemo(() => {
    if (systemUsage.activeSeats <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((systemUsage.activeUsers / systemUsage.activeSeats) * 100)))
  }, [systemUsage.activeUsers, systemUsage.activeSeats])

  function relative(iso: string) {
    const ts = new Date(iso).getTime()
    if (!Number.isFinite(ts)) return formatReferenceDate(iso, 'de-DE')
    const diffMin = Math.max(1, Math.round((nowMs - ts) / 60000))
    if (diffMin < 60) return `vor ${diffMin}m`
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24) return `vor ${diffH}h`
    return formatReferenceDate(iso, 'de-DE')
  }

  if (variant === 'sales_leader') {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-8">
        <p className="text-sm text-muted-foreground">
          Wie performt euer Referenzprogramm — und wo fehlt Abdeckung?
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Referenzen', value: kpis.referencesTotal, trend: kpiTrends.referencesTotal },
            { label: 'Matches (7 Tage)', value: kpis.matches7d, trend: kpiTrends.matches7d },
            {
              label: 'Win-Rate',
              value: winRate.available && winRate.percent != null ? `${winRate.percent} %` : '—',
              hint: winRate.available
                ? `${winRate.closedDealsCount} Deals`
                : `Zu wenig Daten (${winRate.closedDealsCount}/${winRate.minDealsRequired})`,
            },
            { label: 'WAU (7 Tage)', value: kpis.wau7d, trend: kpiTrends.wau7d },
          ].map((k) => (
            <Card key={k.label} className="border-border shadow-sm">
              <CardHeader className="pb-1">
                <CardDescription>{k.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
                {'trend' in k && k.trend != null ? (
                  <p className="text-xs text-muted-foreground">
                    {k.trend > 0 ? '+' : ''}
                    {k.trend} vs. Vorwoche
                  </p>
                ) : null}
                {'hint' in k && k.hint ? (
                  <p className="text-xs text-muted-foreground">{k.hint}</p>
                ) : null}
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adoption</CardTitle>
            <CardDescription>Aktive Nutzer im Team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span>Aktive Nutzer</span>
              <span className="tabular-nums font-medium">
                {systemUsage.activeUsers}/{systemUsage.activeSeats || Math.max(systemUsage.activeUsers, 1)}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top-Referenzen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Event-Daten.</p>
            ) : (
              topReferences.slice(0, 5).map((ref) => (
                <Link
                  key={ref.id}
                  href={ROUTES.references.detail(ref.id)}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span className="truncate font-medium">{ref.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ref.eventCount} Events</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline-Signale & Abdeckungslücken</CardTitle>
            <CardDescription>Accounts mit offenen Deals und relevanten Signalen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contentRoi.gapAlert ? (
              <p className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
                Suche ohne Treffer: <strong>{contentRoi.gapAlert.term}</strong> ({contentRoi.gapAlert.searches}×)
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Zero-Result-Lücken erkannt.</p>
            )}
            {pipelineSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine priorisierten Pipeline-Signale.</p>
            ) : (
              <ul className="space-y-2">
                {pipelineSignals.map((row) => (
                  <li key={row.companyId}>
                    <Link href={row.href} className="block rounded-md border border-border/70 px-3 py-2 hover:bg-muted/40">
                      <p className="text-sm font-medium">
                        {row.companyName} · {row.signalCount} Signale · {row.openDealCount} Deal(s)
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{row.latestSummary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {blockers.length > 0 ? (
        <Card className="border-red-300/70 bg-red-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">1. Critical Blockers · Action Required</p>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-1">
            {blockers.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-red-200/70 bg-background px-3 py-2">
                <div className="min-w-0 inline-flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${b.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{b.title}</span>
                    <span className="text-muted-foreground"> · {b.detail}</span>
                  </p>
                </div>
                <Button asChild size="sm" variant={b.severity === 'high' ? 'default' : 'outline'} className="h-7 px-2.5 text-xs">
                  <Link href={b.href}>{b.ctaLabel}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">2. Strategic Content ROI</p>
            <CardTitle className="text-lg">Content ROI & Gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border/70 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Top Story</p>
              {contentRoi.topStory ? (
                <p className="mt-1 text-sm font-medium">
                  {contentRoi.topStory.title}{' '}
                  <span className="text-emerald-600">({contentRoi.topStory.impactLabel})</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Noch keine belastbare Top-Story.</p>
              )}
            </div>
            <div className="rounded-lg border border-amber-300/60 bg-amber-50/50 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-800">Gap Alert</p>
              {contentRoi.gapAlert ? (
                <p className="mt-1 text-sm text-amber-900">
                  <span className="font-semibold">&quot;{contentRoi.gapAlert.term}&quot;</span> ({contentRoi.gapAlert.searches} Suchen, 0 Referenzen)
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Keine Zero-Result Gaps erkannt.</p>
              )}
            </div>
            <div className="pt-1">
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.references.root}>Referenzbibliothek prüfen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">3. System & Usage</p>
            <CardTitle className="text-lg">Health Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  Active Users
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {systemUsage.activeUsers}/{systemUsage.activeSeats || Math.max(systemUsage.activeUsers, 1)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-amber-600" />
                  API Credits
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {systemUsage.apiCreditUsedPercent != null ? `${systemUsage.apiCreditUsedPercent}%` : 'n/a'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${systemUsage.apiCreditUsedPercent != null && systemUsage.apiCreditUsedPercent >= 85 ? 'bg-red-600' : 'bg-amber-500'}`}
                  style={{ width: `${systemUsage.apiCreditUsedPercent ?? 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/70 px-2.5 py-2 text-xs">
                <p className="text-muted-foreground">Data Freshness</p>
                <p className="mt-1 font-medium">
                  {systemUsage.dataFreshnessMinutes != null ? `${systemUsage.dataFreshnessMinutes}m ago` : 'n/a'}
                </p>
              </div>
              <div className="rounded-md border border-border/70 px-2.5 py-2 text-xs">
                <p className="text-muted-foreground">API Health</p>
                <p className="mt-1 font-medium inline-flex items-center gap-1.5">
                  {systemUsage.apiHealth === 'stable' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : systemUsage.apiHealth === 'warning' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                  )}
                  {systemUsage.apiHealth}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {systemUsage.integrations.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between rounded-md border border-border/70 px-2.5 py-2 text-xs">
                  <span>{integration.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      integration.status === 'healthy'
                        ? 'text-emerald-700'
                        : integration.status === 'warning'
                          ? 'text-amber-700'
                          : 'text-red-700'
                    }`}
                  >
                    <ServerCog className="h-3.5 w-3.5" />
                    {integration.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border/70 px-2.5 py-2 text-xs">
              <p className="text-muted-foreground">News Ingest</p>
              <p className="mt-1 font-medium">
                last run: {newsIngestHealth.lastRunAt ? relative(newsIngestHealth.lastRunAt) : 'n/a'}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                mode: {newsIngestHealth.mode} · scanned: {newsIngestHealth.scannedCompanies ?? 'n/a'} · errors: {newsIngestHealth.errors}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">4. Recent System & Team Activity</p>
          <CardTitle className="text-lg">Audit Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {auditFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Audit-Events verfügbar.</p>
          ) : (
            <ul className="space-y-2">
              {auditFeed.slice(0, 12).map((row) => (
                <li key={row.id} className="rounded-lg border border-border/70 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">{relative(row.timestamp)}:</span>{' '}
                  <span className="text-foreground">{row.text}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Database className="h-3.5 w-3.5" />
        Admin-Ansicht fokussiert auf Skalierung, Blocker und System-Gesundheit.
      </div>
    </div>
  )
}
