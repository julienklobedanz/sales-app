'use client'

import { useState } from 'react'

import { COPY } from '@/lib/copy'
import { ExecutiveTrackingList } from '@/components/market-signals/executive-tracking-list'
import { AccountNewsFeed } from '@/components/market-signals/account-news-feed'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  const [execAccountId, setExecAccountId] = useState('all')
  const [newsAccountId, setNewsAccountId] = useState('all')
  const [newsSegment, setNewsSegment] = useState<'all' | 'customer' | 'prospect'>('all')

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{COPY.pages.marketSignals}</h1>
        <p className="text-muted-foreground text-sm">{COPY.marketSignals.pageSubtitle}</p>
      </div>

      <ExecutiveTrackingList
        items={model.executives}
        companies={model.companies}
        accountFilterId={execAccountId}
        onAccountFilterChange={setExecAccountId}
      />

      <AccountNewsFeed
        items={model.news}
        companies={model.companies}
        accountFilterId={newsAccountId}
        segmentFilter={newsSegment}
        onAccountFilterChange={setNewsAccountId}
        onSegmentFilterChange={setNewsSegment}
      />
    </div>
  )
}
