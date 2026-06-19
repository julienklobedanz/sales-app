'use client'

import Link from 'next/link'

import type { InsightsPageModel } from '@/app/dashboard/insights/insights-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'

export function InsightsClient({ data }: { data: InsightsPageModel }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.scope === 'all' ? 'Workspace-weite Kennzahlen' : 'Deine Referenzen'} · letzte{' '}
          {data.windowDays} Tage
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Detail-Ansichten', value: data.usage.views },
          { label: 'Shares', value: data.usage.shares },
          { label: 'Matches', value: data.usage.matches },
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
          <CardTitle className="text-base">Adoption</CardTitle>
          <CardDescription>Wöchentlich aktive Nutzer im Team.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <span className="font-medium tabular-nums">{data.adoption.wau}</span>
          <span className="text-muted-foreground"> / {data.adoption.teamSize} Mitglieder (WAU)</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Win-Rate mit vs. ohne Referenz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!data.winRate.meaningful ? (
            <p className="text-muted-foreground">
              Nicht aussagekräftig — zu wenige abgeschlossene Deals (
              {data.winRate.withReference.total + data.winRate.withoutReference.total} von mindestens{' '}
              {data.winRate.minDealsRequired}).
            </p>
          ) : (
            <>
              <p>
                Mit Referenz:{' '}
                {data.winRate.withReference.rate != null
                  ? `${data.winRate.withReference.rate} %`
                  : '—'}{' '}
                ({data.winRate.withReference.won}/{data.winRate.withReference.total})
              </p>
              <p>
                Ohne Referenz:{' '}
                {data.winRate.withoutReference.rate != null
                  ? `${data.winRate.withoutReference.rate} %`
                  : '—'}{' '}
                ({data.winRate.withoutReference.won}/{data.winRate.withoutReference.total})
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-Referenzen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topReferences.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Events im Zeitraum.</p>
          ) : (
            data.topReferences.map((ref) => (
              <Link
                key={ref.id}
                href={ROUTES.evidence.detail(ref.id)}
                className="flex justify-between gap-2 rounded-md border border-border/70 px-3 py-2 text-sm hover:bg-muted/40"
              >
                <span className="truncate font-medium">{ref.title}</span>
                <span className="shrink-0 text-muted-foreground">{ref.eventCount} Events</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abdeckungslücken</CardTitle>
          <CardDescription>Suchen ohne Treffer.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.coverageGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine dokumentierten Lücken.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.coverageGaps.map((g) => (
                <li key={g.term}>
                  <span className="font-medium">{g.term}</span>
                  <span className="text-muted-foreground"> · {g.searches} Suchen</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
