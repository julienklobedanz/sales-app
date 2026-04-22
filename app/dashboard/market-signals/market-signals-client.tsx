'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FilterHorizontalIcon, InformationCircleIcon } from '@hugeicons/core-free-icons'

import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { ExecutiveTrackingList } from '@/components/market-signals/executive-tracking-list'
import { AccountNewsFeed } from '@/components/market-signals/account-news-feed'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  const [onlyActiveDeals, setOnlyActiveDeals] = useState(false)
  const restrictedCompanyIds = useMemo(
    () => (onlyActiveDeals ? model.activeDealCompanyIds : undefined),
    [model.activeDealCompanyIds, onlyActiveDeals]
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-slate-900/5">
        <div className="flex min-w-0 items-start gap-2.5 text-sm text-muted-foreground">
          <AppIcon icon={InformationCircleIcon} size={16} className="mt-0.5 shrink-0" />
          <p className="min-w-0">
            <span className="font-medium text-foreground">Watchlist-Logik:</span> Unternehmen folgen fuer Account News,
            Personen folgen fuer Executive Moves.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="toolbar"
            onClick={() => setOnlyActiveDeals((prev) => !prev)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
              onlyActiveDeals
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15'
                : 'border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <AppIcon icon={FilterHorizontalIcon} size={14} />
            Nur fuer aktive Deals
          </Button>
          <Button variant="ghost" size="toolbar" className="h-9 px-3 text-slate-500 hover:bg-muted/70" asChild>
            <Link href={ROUTES.marketSignalsManage}>Watchlist verwalten</Link>
          </Button>
        </div>
      </div>
      <ExecutiveTrackingList
        items={model.executives}
        companies={model.companies}
        followingCompanyIds={model.followingCompanyIds}
        initialReadKeys={model.signalReadKeys}
        restrictedCompanyIds={restrictedCompanyIds}
      />

      <AccountNewsFeed
        items={model.news}
        companies={model.companies}
        followingCompanyIds={model.followingCompanyIds}
        initialReadKeys={model.signalReadKeys}
        restrictedCompanyIds={restrictedCompanyIds}
      />
    </div>
  )
}
