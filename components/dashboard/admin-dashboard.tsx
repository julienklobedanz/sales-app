'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Cancel01Icon, UploadIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CheckIcon } from '@/components/ui/check-icon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { reviewRequest } from '@/app/dashboard/actions'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import type { AdminDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'

function TrendHint({ delta }: { delta: number }) {
  const sign = delta > 0 ? '+' : ''
  const tone =
    delta > 0
      ? 'text-emerald-600'
      : delta < 0
        ? 'text-rose-600'
        : 'text-muted-foreground'
  return <p className={`text-xs font-medium ${tone}`}>{`${sign}${delta} diese Woche`}</p>
}

export function AdminDashboard({ data }: { data: AdminDashboardModel }) {
  const { kpis, topReferences, openRequests, teamActivity } = data
  const [isPending, startTransition] = useTransition()
  const [visibleTeamActivityCount, setVisibleTeamActivityCount] = useState(5)
  const staleThreshold = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 12)
    return d.getTime()
  }, [])

  function requestDecision(approvalId: string, decision: 'approve_external' | 'reject') {
    startTransition(async () => {
      try {
        await reviewRequest(approvalId, decision)
      } catch {
        toast.error('Aktion fehlgeschlagen.')
        return
      }
      toast.success(decision === 'approve_external' ? 'Anfrage freigegeben.' : 'Anfrage abgelehnt.')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="h-[62px]" aria-hidden />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardDescription>Referenzen gesamt</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.referencesTotal}</CardTitle>
            <TrendHint delta={data.kpiTrends.referencesTotal} />
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardDescription>Matches (7 Tage)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.matches7d}</CardTitle>
            <TrendHint delta={data.kpiTrends.matches7d} />
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardDescription>Shares &amp; Link-Views (7 Tage)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.shares7d}</CardTitle>
            <TrendHint delta={data.kpiTrends.shares7d} />
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardDescription>Aktive Nutzer (Events, 7 Tage)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.wau7d}</CardTitle>
            <TrendHint delta={data.kpiTrends.wau7d} />
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Top-Referenzen (Nutzung, 7 Tage)</CardTitle>
            <CardDescription>Nach Anzahl relevanter Events mit Referenz-ID.</CardDescription>
          </CardHeader>
          <CardContent>
            {topReferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine ausreichenden Daten.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topReferences.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2">
                    <Link
                      href={ROUTES.evidence.detail(r.id)}
                      className="min-w-0 inline-flex items-center gap-2.5 font-medium truncate hover:underline"
                    >
                      <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/35">
                        {r.companyLogoUrl ? (
                          <Image src={r.companyLogoUrl} alt="" fill sizes="28px" className="object-contain p-1" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{r.companyName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="truncate">{r.title}</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {r.updatedAt && new Date(r.updatedAt).getTime() < staleThreshold ? (
                        <span className="inline-flex items-center text-amber-600" title="Update needed">
                          <AppIcon icon={UploadIcon} size={13} />
                        </span>
                      ) : null}
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
                        {r.eventCount}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Offene Referenz-Anfragen</CardTitle>
            <CardDescription>Interne Freigabe-Anfragen (pending).</CardDescription>
          </CardHeader>
          <CardContent>
            {openRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Anfragen.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {openRequests.slice(0, 4).map((r) => (
                  <li key={r.id} className="group/request flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <Link href={ROUTES.evidence.detail(r.reference_id)} className="font-medium hover:underline">
                        {r.reference_title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {r.company_name} · {formatDateUtcDe(r.created_at)}
                      </span>
                    </div>
                    <div className="hidden items-center gap-1 group-hover/request:flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600"
                        disabled={isPending}
                        onClick={() => requestDecision(r.id, 'approve_external')}
                        aria-label="Approve"
                      >
                        <CheckIcon className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                        disabled={isPending}
                        onClick={() => requestDecision(r.id, 'reject')}
                        aria-label="Deny"
                      >
                        <AppIcon icon={Cancel01Icon} size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-center rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href={ROUTES.request}>Alle Anfragen</Link>
                  </Button>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Team-Aktivität (7 Tage)</CardTitle>
          <CardDescription>Lesbarer Feed aus den letzten Team-Events.</CardDescription>
        </CardHeader>
        <CardContent>
          {teamActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Team-Aktivität in diesem Fenster.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {teamActivity.slice(0, visibleTeamActivityCount).map((row) => (
                  <li key={row.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
                    <Avatar size="sm">
                      <AvatarFallback>{row.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 flex-1 text-sm text-foreground">
                      <span className="font-medium">{row.displayName}</span> {row.actionLabel}
                      {row.companyName ? (
                        <>
                          {' '}fuer{' '}
                          <span className="inline-flex items-center gap-1.5">
                            <span className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/35">
                              {row.companyLogoUrl ? (
                                <Image src={row.companyLogoUrl} alt="" fill sizes="16px" className="object-contain p-0.5" />
                              ) : null}
                            </span>
                            <span className="font-medium">{row.companyName}</span>
                          </span>
                        </>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">{formatDateUtcDe(row.timestamp)}</span>
                  </li>
                ))}
              </ul>
              {teamActivity.length > visibleTeamActivityCount ? (
                <div className="flex justify-center pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-slate-500 hover:bg-muted/70"
                    onClick={() => setVisibleTeamActivityCount((prev) => prev + 5)}
                  >
                    5 weitere anzeigen
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Win-Rate, Revenue und Branchen-Abdeckung sind für eine spätere Ausbaustufe vorgesehen.
      </p>
    </div>
  )
}
