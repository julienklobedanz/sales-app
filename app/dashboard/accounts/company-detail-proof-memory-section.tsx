'use client'

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateUtcDe } from '@/lib/format'
import { ROUTES } from '@/lib/routes'

import type { AccountProofHistoryItem, AccountProofImpactRow } from '@/lib/accounts/account-proof-memory-pure'

export function AccountProofImpactCard({ rows }: { rows: AccountProofImpactRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Was hier funktioniert hat</CardTitle>
        <CardDescription>
          Aggregiert über alle Deals dieses Accounts — unabhängig vom aktuellen Account Manager.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Beweis-Wirkung an Deals dieses Accounts — sobald Referenzen verknüpft, geteilt
            oder Deals abgeschlossen werden, erscheint hier die Historie.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.referenceId}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                <div>
                  <Link
                    href={ROUTES.references.detail(row.referenceId)}
                    className="font-medium hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.dealCount} Deal{row.dealCount === 1 ? '' : 's'}
                    {row.wonDealCount > 0 ? ` · ${row.wonDealCount} gewonnen` : ''}
                    {row.viewCount > 0 ? ` · ${row.viewCount} Öffnung${row.viewCount === 1 ? '' : 'en'}` : ''}
                  </p>
                </div>
                {row.decisiveCount > 0 ? (
                  <Badge variant="secondary" className="shrink-0">
                    Entscheidend
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function AccountProofHistoryCard({ items }: { items: AccountProofHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beweis-Historie</CardTitle>
        <CardDescription>
          Chronologisch: geteilt, geöffnet und Deal-Abschlüsse mit Beweisbezug.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Ereignisse für diesen Account erfasst.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="border-l-2 border-muted pl-3 text-sm">
                <time className="text-xs text-muted-foreground" dateTime={item.at}>
                  {formatDateUtcDe(item.at)}
                </time>
                <p className="font-medium">{item.label}</p>
                {item.detail ? (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                ) : null}
                {item.dealId ? (
                  <Link
                    href={ROUTES.deals.detail(item.dealId)}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Zum Deal
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
