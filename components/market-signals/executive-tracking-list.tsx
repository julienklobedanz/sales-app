'use client'

import Link from 'next/link'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import type { ExecutiveTrackingRow, MarketSignalsCompanyOption } from '@/app/dashboard/market-signals/data'

function initialsFromName(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean)
  if (w.length >= 2) {
    const a = w[0]?.charAt(0) ?? ''
    const b = w[1]?.charAt(0) ?? ''
    return (a + b).toUpperCase() || '?'
  }
  if (name.length >= 2) return name.slice(0, 2).toUpperCase()
  return name.slice(0, 1).toUpperCase() || '?'
}

function isNewWithinDays(iso: string, days: number) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  const diff = Date.now() - t
  return diff >= 0 && diff <= days * 86400000
}

function relativeTimeLabel(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffMs = Date.now() - t
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'Heute'
  if (days === 1) return 'Gestern'
  return `vor ${days} Tagen`
}

export function ExecutiveTrackingList({
  items,
  companies,
  accountFilterId,
  onAccountFilterChange,
}: {
  items: ExecutiveTrackingRow[]
  companies: MarketSignalsCompanyOption[]
  accountFilterId: string
  onAccountFilterChange: (id: string) => void
}) {
  const filtered =
    accountFilterId === 'all'
      ? items
      : items.filter((e) => e.companyId === accountFilterId)

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-base">{COPY.marketSignals.executiveSection}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="exec-account-filter" className="text-muted-foreground text-xs">
            {COPY.marketSignals.filterAccount}
          </Label>
          <Select value={accountFilterId} onValueChange={onAccountFilterChange}>
            <SelectTrigger id="exec-account-filter" className="max-w-md">
              <SelectValue placeholder={COPY.marketSignals.allAccounts} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{COPY.marketSignals.allAccounts}</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm">
            <p className="font-medium text-foreground">{COPY.marketSignals.executiveEmptyTitle}</p>
            <p className="mt-1 text-muted-foreground">{COPY.marketSignals.executiveEmptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((row) => {
              const roleLine = [row.personTitleBefore, row.personTitleAfter]
                .filter(Boolean)
                .join(` ${COPY.marketSignals.roleChangeArrow} `)
              const showNew = isNewWithinDays(row.detectedAt, 7)
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <Avatar className="h-10 w-10 shrink-0 border border-border">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                        {initialsFromName(row.personName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{row.personName}</span>
                        {roleLine ? (
                          <span className="text-muted-foreground text-sm">· {roleLine}</span>
                        ) : null}
                        <span className="text-muted-foreground text-sm">· {row.companyName}</span>
                        {showNew ? (
                          <Badge variant="secondary" className="text-xs">
                            {COPY.marketSignals.newBadge}
                          </Badge>
                        ) : null}
                        <span className="text-muted-foreground text-xs">{relativeTimeLabel(row.detectedAt)}</span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-snug">{row.changeSummary}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                    <Link href={ROUTES.accountsDetail(row.companyId)}>{COPY.marketSignals.openAccount}</Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
