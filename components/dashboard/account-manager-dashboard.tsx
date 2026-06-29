'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CirclePlus, UploadIcon } from '@hugeicons/core-free-icons'
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

export function AccountManagerDashboard({ data }: { data: AccountManagerDashboardModel }) {
  const { kpis, pendingApprovalsCount, pendingApprovals, usageByReference } = data
  const [remindingId, setRemindingId] = useState<string | null>(null)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-8">
      <p className="text-sm text-muted-foreground">
        Welche Referenzen brauchen deine Aufmerksamkeit?
      </p>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default" className="gap-2">
          <Link href={ROUTES.references.new}>
            <AppIcon icon={CirclePlus} size={18} />
            Referenz anlegen
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href={ROUTES.references.newBulk}>
            <AppIcon icon={UploadIcon} size={18} />
            Bulk-Import
          </Link>
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Eigene Referenzen nach Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Gesamt', value: kpis.total },
              { label: 'Freigegeben', value: kpis.approved },
              { label: 'Nur intern', value: kpis.internal },
              { label: 'Entwurf', value: kpis.draft },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-semibold tabular-nums">{k.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ausstehende Freigaben ({pendingApprovalsCount})</CardTitle>
          <CardDescription>Inkl. Kunden-Änderungswünsche in der Detailansicht.</CardDescription>
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
                      href={ROUTES.references.detail(p.referenceId)}
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
                            loading: 'Neuer Link wird erzeugt …',
                            success: 'Neuer Freigabe-Link aktiv.',
                            error: (e) => (e instanceof Error ? e.message : 'Fehler'),
                          })
                          .unwrap()
                          .finally(() => setRemindingId(null))
                      }}
                    >
                      Neuen Link
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
          <CardTitle className="text-base">Nutzung deiner Referenzen</CardTitle>
          <CardDescription>Views, Shares und Matches (letzte 30 Tage).</CardDescription>
        </CardHeader>
        <CardContent>
          {usageByReference.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Nutzungsdaten.</p>
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
                {usageByReference.slice(0, 8).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={ROUTES.references.detail(r.id)} className="hover:underline">
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
    </div>
  )
}
