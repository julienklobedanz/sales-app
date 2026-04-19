'use client'

import Link from 'next/link'

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
import { formatDateUtcDe } from '@/lib/format'
import type { AccountNewsRow, MarketSignalsCompanyOption } from '@/app/dashboard/market-signals/data'

function publishedLabel(dateStr: string) {
  const iso = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00.000Z`
  return formatDateUtcDe(iso)
}

export function AccountNewsFeed({
  items,
  companies,
  accountFilterId,
  segmentFilter,
  onAccountFilterChange,
  onSegmentFilterChange,
}: {
  items: AccountNewsRow[]
  companies: MarketSignalsCompanyOption[]
  accountFilterId: string
  segmentFilter: 'all' | 'customer' | 'prospect'
  onAccountFilterChange: (id: string) => void
  onSegmentFilterChange: (v: 'all' | 'customer' | 'prospect') => void
}) {
  const filtered = items.filter((n) => {
    if (accountFilterId !== 'all' && n.companyId !== accountFilterId) return false
    if (segmentFilter === 'all') return true
    return n.segment === segmentFilter
  })

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-base">{COPY.marketSignals.newsSection}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2 sm:min-w-[200px]">
            <Label htmlFor="news-account-filter" className="text-muted-foreground text-xs">
              {COPY.marketSignals.filterAccount}
            </Label>
            <Select value={accountFilterId} onValueChange={onAccountFilterChange}>
              <SelectTrigger id="news-account-filter" className="max-w-md">
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
          <div className="space-y-2 sm:min-w-[200px]">
            <Label htmlFor="news-segment-filter" className="text-muted-foreground text-xs">
              {COPY.marketSignals.filterSegmentLabel}
            </Label>
            <Select
              value={segmentFilter}
              onValueChange={(v) => onSegmentFilterChange(v as 'all' | 'customer' | 'prospect')}
            >
              <SelectTrigger id="news-segment-filter" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{COPY.marketSignals.segmentAll}</SelectItem>
                <SelectItem value="customer">{COPY.marketSignals.segmentCustomers}</SelectItem>
                <SelectItem value="prospect">{COPY.marketSignals.segmentProspects}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm">
            <p className="font-medium text-foreground">{COPY.marketSignals.newsEmptyTitle}</p>
            <p className="mt-1 text-muted-foreground">{COPY.marketSignals.newsEmptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-medium text-foreground">{row.companyName}</span>
                    <span className="text-muted-foreground text-sm">· {publishedLabel(row.publishedOn)}</span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed">{row.body}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.sourceLabel ? (
                      <Badge variant="outline" className="text-xs font-normal">
                        {COPY.marketSignals.sourcePrefix}: {row.sourceLabel}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                  <Link href={ROUTES.accountsDetail(row.companyId)}>{COPY.marketSignals.openAccount}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
