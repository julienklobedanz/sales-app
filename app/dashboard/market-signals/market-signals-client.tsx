'use client'

import Link from 'next/link'

import { COPY } from '@/lib/copy'
import { ExecutiveTrackingList } from '@/components/market-signals/executive-tracking-list'
import { AccountNewsFeed } from '@/components/market-signals/account-news-feed'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  if (model.followingCompanyIds.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-border/70 bg-card">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-950">{COPY.marketSignals.emptyFollowingTitle}</p>
            <p className="text-sm text-slate-500">{COPY.marketSignals.emptyFollowingBody}</p>
          </div>
          <Button
            asChild
            size="toolbar"
            className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
          >
            <Link href={ROUTES.accounts}>{COPY.marketSignals.emptyFollowingCta}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <ExecutiveTrackingList
        items={model.executives}
        companies={model.companies}
        followingCompanyIds={model.followingCompanyIds}
      />

      <AccountNewsFeed
        items={model.news}
        companies={model.companies}
        followingCompanyIds={model.followingCompanyIds}
      />
    </div>
  )
}
