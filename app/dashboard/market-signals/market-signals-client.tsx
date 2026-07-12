'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Radar, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { AccountNewsFeed } from '@/components/market-signals/account-news-feed'
import { ExecutiveTrackingList } from '@/components/market-signals/executive-tracking-list'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { triggerMarketSignalsIngestForMyOrg } from '@/app/dashboard/market-signals/actions'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'customer' | 'prospect'>('all')

  const followingSet = useMemo(() => new Set(model.followingCompanyIds), [model.followingCompanyIds])

  const filteredNews = useMemo(() => {
    return model.news.filter((row) => {
      if (!followingSet.has(row.companyId)) return false
      if (accountFilter !== 'all' && row.companyId !== accountFilter) return false
      if (segmentFilter !== 'all' && row.segment !== segmentFilter) return false
      return true
    })
  }, [accountFilter, followingSet, model.news, segmentFilter])

  const filteredExecutives = useMemo(() => {
    return model.executives.filter((row) => {
      if (!followingSet.has(row.companyId)) return false
      if (accountFilter !== 'all' && row.companyId !== accountFilter) return false
      return true
    })
  }, [accountFilter, followingSet, model.executives])

  const watchedCompanies = useMemo(
    () => model.companies.filter((company) => followingSet.has(company.id)),
    [followingSet, model.companies]
  )

  const hasWatchlist = model.followingCompanyIds.length > 0

  function handleRefresh() {
    startRefresh(async () => {
      const result = await triggerMarketSignalsIngestForMyOrg({
        ingestMode: 'focus_only',
        refreshFeeds: true,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Feeds aktualisiert.')
      router.refresh()
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radar className="size-5 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">{COPY.nav.marketSignals}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{COPY.marketSignals.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || !hasWatchlist}
          >
            <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Feeds abrufen
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={ROUTES.marketSignalsManage}>
              <Settings className="mr-2 size-4" />
              {COPY.marketSignals.manage}
            </Link>
          </Button>
        </div>
      </div>

      {!hasWatchlist ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
          <p className="font-medium text-foreground">{COPY.marketSignals.emptyFollowingTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{COPY.marketSignals.emptyFollowingBody}</p>
          <Button type="button" className="mt-4" asChild>
            <Link href={ROUTES.marketSignalsManage}>{COPY.marketSignals.emptyFollowingCta}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={COPY.marketSignals.filterAccount} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{COPY.marketSignals.allAccounts}</SelectItem>
                {watchedCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={segmentFilter}
              onValueChange={(value) => setSegmentFilter(value as 'all' | 'customer' | 'prospect')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={COPY.marketSignals.filterSegmentLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{COPY.marketSignals.segmentAll}</SelectItem>
                <SelectItem value="customer">{COPY.marketSignals.segmentCustomers}</SelectItem>
                <SelectItem value="prospect">{COPY.marketSignals.segmentProspects}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ExecutiveTrackingList
              items={filteredExecutives}
              companies={model.companies}
              followingCompanyIds={model.followingCompanyIds}
              championWatchlist={model.championWatchlist}
              initialReadKeys={model.signalReadKeys}
              restrictedCompanyIds={model.activeDealCompanyIds}
            />
            <AccountNewsFeed
              items={filteredNews}
              followingCompanyIds={model.followingCompanyIds}
              initialReadKeys={model.signalReadKeys}
              restrictedCompanyIds={model.activeDealCompanyIds}
            />
          </div>
        </>
      )}
    </div>
  )
}
