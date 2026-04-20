import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ROUTES } from '@/lib/routes'
import type { AdminDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { formatDateUtcDe } from '@/lib/format'
import { DASHBOARD_PAGE_SUBTITLE_CLASS, DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'

export function AdminDashboard({ data }: { data: AdminDashboardModel }) {
  const { greetingName, kpis, topReferences, openRequests, teamActivity } = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>
          Admin-Dashboard{greetingName ? `, ${greetingName}` : ''}
        </h1>
        <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
          Team-KPIs, häufig genutzte Referenzen und offene Anfragen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Referenzen gesamt</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.referencesTotal}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Matches (7 Tage)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.matches7d}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Shares &amp; Link-Views (7 Tage)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.shares7d}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Aktive Nutzer (Events, 7 Tage)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpis.wau7d}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top-Referenzen (Nutzung, 7 Tage)</CardTitle>
            <CardDescription>Nach Anzahl relevanter Events mit Referenz-ID.</CardDescription>
          </CardHeader>
          <CardContent>
            {topReferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine ausreichenden Daten.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topReferences.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <Link
                      href={ROUTES.evidence.detail(r.id)}
                      className="font-medium truncate hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{r.eventCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offene Referenz-Anfragen</CardTitle>
            <CardDescription>Interne Freigabe-Anfragen (pending).</CardDescription>
          </CardHeader>
          <CardContent>
            {openRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offenen Anfragen.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {openRequests.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0">
                    <Link href={ROUTES.evidence.detail(r.reference_id)} className="font-medium hover:underline">
                      {r.reference_title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {r.company_name} · {formatDateUtcDe(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" className="mt-4 w-full sm:w-auto">
              <Link href={ROUTES.request}>Alle Anfragen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team-Aktivität (7 Tage)</CardTitle>
          <CardDescription>Matches und Share-/Link-Events pro Person (Audit-Log).</CardDescription>
        </CardHeader>
        <CardContent>
          {teamActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Team-Aktivität in diesem Fenster.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamActivity.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">{row.displayName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.matches}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Win-Rate, Revenue und Branchen-Abdeckung sind für eine spätere Ausbaustufe vorgesehen.
      </p>
    </div>
  )
}
