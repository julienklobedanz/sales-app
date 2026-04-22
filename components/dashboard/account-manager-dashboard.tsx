'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CirclePlus, MailOpen, UploadIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import type { AccountManagerDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'
import { toast } from 'sonner'
import { resendClientApprovalEmail } from '@/app/dashboard/actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

export function AccountManagerDashboard({ data }: { data: AccountManagerDashboardModel }) {
  const {
    kpis,
    kpiTrends,
    pendingApprovalsCount,
    pendingApprovals,
    usageWindowDays,
    usageTotals,
    usageByReference,
  } = data
  const [remindingId, setRemindingId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div className="h-[62px]" aria-hidden />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default" className="gap-2">
          <Link href={ROUTES.evidence.new}>
            <AppIcon icon={CirclePlus} size={18} />
            Referenz anlegen
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href={ROUTES.evidence.newBulk}>
            <AppIcon icon={UploadIcon} size={18} />
            Bulk-Import
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href={ROUTES.evidence.root}>
            <AppIcon icon={MailOpen} size={18} />
            Freigaben ({pendingApprovalsCount})
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Gesamt', value: kpis.total },
          { label: 'Freigegeben', value: kpis.approved },
          { label: 'Nur intern', value: kpis.internal },
          { label: 'Entwurf', value: kpis.draft },
        ].map((k) => (
          <Card key={k.label} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-1">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
              <TrendHint
                delta={
                  k.label === 'Gesamt'
                    ? kpiTrends.total
                    : k.label === 'Freigegeben'
                      ? kpiTrends.approved
                      : k.label === 'Nur intern'
                        ? kpiTrends.internal
                        : kpiTrends.draft
                }
              />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ausstehende Kunden-Freigaben</CardTitle>
          <CardDescription>Per E-Mail-Link; Status &quot;pending&quot;.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine ausstehenden Freigaben.</p>
          ) : (
            <ul className="space-y-3">
              {pendingApprovals.slice(0, 8).map((p) => (
                <li
                  key={p.approvalId}
                  className="flex flex-col gap-1 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={ROUTES.evidence.detail(p.referenceId)}
                      className="font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {p.companyName} · angefragt {formatDateUtcDe(p.requestedAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={remindingId === p.referenceId}
                      onClick={() => {
                        setRemindingId(p.referenceId)
                        void toast
                          .promise(resendClientApprovalEmail(p.referenceId), {
                            loading: 'Erinnerung wird gesendet …',
                            success: 'Erinnerung gesendet.',
                            error: (e) => (e instanceof Error ? e.message : 'Konnte Erinnerung nicht senden.'),
                          })
                          .unwrap()
                          .finally(() => setRemindingId(null))
                      }}
                    >
                      Erinnerung senden
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={ROUTES.evidence.detail(p.referenceId)}>Details</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nutzung (Workspace)</CardTitle>
          <CardDescription>
            Aggregiert aus dem Audit-Log, letzte {usageWindowDays} Tage (alle Referenzen der
            Organisation).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Detail-Ansichten</div>
              <div className="text-xl font-semibold tabular-nums">{usageTotals.views}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Shares &amp; Link-Aufrufe</div>
              <div className="text-xl font-semibold tabular-nums">{usageTotals.shares}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Such-Treffer</div>
              <div className="text-xl font-semibold tabular-nums">{usageTotals.matches}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nutzung deiner Referenzen (Auszug)</CardTitle>
          <CardDescription>Views, Shares und Matches der letzten {usageWindowDays} Tage.</CardDescription>
        </CardHeader>
        <CardContent>
          {usageByReference.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Nutzungsdaten für deine Referenzen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referenz</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageByReference.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={ROUTES.evidence.detail(r.id)} className="hover:underline">
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.views}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.shares}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.matches}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Advocate-Health-Warnungen und Drag&amp;Drop-Import sind für eine spätere Ausbaustufe
        vorgesehen.
      </p>
    </div>
  )
}
