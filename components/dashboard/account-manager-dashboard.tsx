import Link from 'next/link'
import { CirclePlus, MailOpen, UploadIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import type { AccountManagerDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'

export function AccountManagerDashboard({ data }: { data: AccountManagerDashboardModel }) {
  const {
    greetingName,
    kpis,
    pendingApprovalsCount,
    pendingApprovals,
    usageWindowDays,
    usageTotals,
  } = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard{greetingName ? `, ${greetingName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Referenzen, Freigaben und Nutzung im Workspace.
        </p>
      </div>

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
          <Card key={k.label}>
            <CardHeader className="pb-1">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
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
                  <Button asChild variant="outline" size="sm">
                    <Link href={ROUTES.evidence.detail(p.referenceId)}>Öffnen</Link>
                  </Button>
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

      <p className="text-xs text-muted-foreground">
        Advocate-Health-Warnungen und Drag&amp;Drop-Import sind für eine spätere Ausbaustufe
        vorgesehen.
      </p>
    </div>
  )
}
