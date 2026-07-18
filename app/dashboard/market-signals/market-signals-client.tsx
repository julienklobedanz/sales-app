'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Radar, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { MarketSignalsFeed, type FeedSort } from '@/components/market-signals/market-signals-feed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { triggerMarketSignalsIngestForMyOrg } from '@/app/dashboard/market-signals/actions'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { COPY } from '@/lib/copy'
import { isLeadershipMoveTitle, parseLeadershipMoveFromTitle } from '@/lib/market-signals/leadership-move'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

type FeedFilter = 'all' | 'people' | 'company' | 'champions' | 'with_deal'

const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: COPY.marketSignals.filterChipAll },
  { id: 'people', label: COPY.marketSignals.filterChipPeople },
  { id: 'company', label: COPY.marketSignals.filterChipCompany },
  { id: 'champions', label: COPY.marketSignals.filterChipChampions },
  { id: 'with_deal', label: COPY.marketSignals.filterChipWithDeal },
]

function formatLastUpdatedAt(iso: string | null): string {
  if (!iso) return COPY.marketSignals.lastUpdatedNever
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return COPY.marketSignals.lastUpdatedNever
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function countLabel(count: number, singular: string, plural: string): string {
  return (count === 1 ? singular : plural).replace('{count}', String(count))
}

function normalizePersonKey(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [sort, setSort] = useState<FeedSort>('relevance')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [accountPickerOpen, setAccountPickerOpen] = useState(false)
  const [accountQuery, setAccountQuery] = useState('')

  const followingSet = useMemo(() => new Set(model.followingCompanyIds), [model.followingCompanyIds])
  const championSet = useMemo(
    () => new Set(model.championWatchlist.map(normalizePersonKey)),
    [model.championWatchlist]
  )
  const dealCompanySet = useMemo(
    () => new Set(model.activeDealCompanyIds),
    [model.activeDealCompanyIds]
  )

  const watchedCompanies = useMemo(
    () => model.companies.filter((company) => followingSet.has(company.id)),
    [followingSet, model.companies]
  )

  const accountOptions = useMemo(() => {
    const q = accountQuery.trim().toLowerCase()
    if (!q) return watchedCompanies.slice(0, 12)
    return watchedCompanies
      .filter((company) => company.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [accountQuery, watchedCompanies])

  const selectedAccountName =
    accountFilter === 'all'
      ? COPY.marketSignals.filterAccountAll
      : (watchedCompanies.find((c) => c.id === accountFilter)?.name ?? COPY.marketSignals.filterAccount)

  const watchlistNews = useMemo(
    () => model.news.filter((row) => followingSet.has(row.companyId)),
    [followingSet, model.news]
  )

  const watchlistExecutives = useMemo(
    () =>
      model.executives.filter(
        (row) => followingSet.has(row.companyId) || championSet.has(normalizePersonKey(row.personName))
      ),
    [championSet, followingSet, model.executives]
  )

  const filteredNews = useMemo(() => {
    return watchlistNews.filter((row) => {
      if (accountFilter !== 'all' && row.companyId !== accountFilter) return false
      if (feedFilter === 'with_deal' && !dealCompanySet.has(row.companyId)) return false
      if (feedFilter === 'company') return !isLeadershipMoveTitle(row.body)
      if (feedFilter === 'people') return isLeadershipMoveTitle(row.body)
      if (feedFilter === 'champions') {
        const parsed = parseLeadershipMoveFromTitle(row.body, row.companyName)
        return Boolean(parsed.personName && championSet.has(normalizePersonKey(parsed.personName)))
      }
      return true
    })
  }, [accountFilter, championSet, dealCompanySet, feedFilter, watchlistNews])

  const filteredExecutives = useMemo(() => {
    return watchlistExecutives.filter((row) => {
      if (accountFilter !== 'all' && row.companyId !== accountFilter) return false
      if (feedFilter === 'company') return false
      if (feedFilter === 'champions' && !championSet.has(normalizePersonKey(row.personName))) {
        return false
      }
      if (feedFilter === 'with_deal' && !dealCompanySet.has(row.companyId)) return false
      return true
    })
  }, [accountFilter, championSet, dealCompanySet, feedFilter, watchlistExecutives])

  const hasWatchlist = model.followingCompanyIds.length > 0

  const briefingLine = useMemo(() => {
    const updated = formatLastUpdatedAt(model.lastUpdatedAt)
    const execPart = countLabel(
      watchlistExecutives.length,
      COPY.marketSignals.briefingExecCount,
      COPY.marketSignals.briefingExecCountPlural
    )
    const companyPart = countLabel(
      watchlistNews.length,
      COPY.marketSignals.briefingCompanyCount,
      COPY.marketSignals.briefingCompanyCountPlural
    )
    return `${COPY.marketSignals.lastUpdatedPrefix}: ${updated} · ${execPart} · ${companyPart}`
  }, [model.lastUpdatedAt, watchlistExecutives.length, watchlistNews.length])

  function handleRefresh() {
    toast.message(COPY.marketSignals.feedsRefreshPending)
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
          {hasWatchlist ? (
            <p className="text-[11px] text-muted-foreground/70">{briefingLine}</p>
          ) : null}
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
            {isRefreshing ? 'Wird abgerufen …' : 'Feeds abrufen'}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 flex flex-wrap items-center gap-2 sm:order-1">
              <Popover open={accountPickerOpen} onOpenChange={setAccountPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'rounded-[5px] border border-border/80 px-2 py-1 text-xs font-medium transition-colors',
                      accountFilter !== 'all'
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : 'bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground'
                    )}
                  >
                    {COPY.marketSignals.filterAccount}:{' '}
                    <span className="text-foreground">{selectedAccountName}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-2">
                  <Input
                    value={accountQuery}
                    onChange={(e) => setAccountQuery(e.target.value)}
                    placeholder={COPY.marketSignals.filterAccountSearch}
                    className="mb-2 h-8 text-sm"
                  />
                  <div className="max-h-56 space-y-0.5 overflow-auto">
                    <button
                      type="button"
                      className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setAccountFilter('all')
                        setAccountPickerOpen(false)
                        setAccountQuery('')
                      }}
                    >
                      {COPY.marketSignals.filterAccountAll}
                    </button>
                    {accountOptions.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setAccountFilter(company.id)
                          setAccountPickerOpen(false)
                          setAccountQuery('')
                        }}
                      >
                        {company.name}
                      </button>
                    ))}
                    {accountOptions.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-muted-foreground">Keine Treffer</p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>

              <div
                role="tablist"
                aria-label="Sortierung"
                className="inline-flex shrink-0 gap-0.5 rounded-md border border-border/80 bg-muted/40 p-0.5"
              >
                {(
                  [
                    { id: 'relevance' as const, label: COPY.marketSignals.sortRelevance },
                    { id: 'date' as const, label: COPY.marketSignals.sortDate },
                  ] as const
                ).map((option) => {
                  const selected = sort === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setSort(option.id)}
                      className={cn(
                        'shrink-0 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors',
                        selected
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Signal-Filter"
              className="order-1 inline-flex w-full max-w-full flex-wrap justify-start gap-0.5 rounded-md border border-border/80 bg-muted/40 p-0.5 sm:order-2 sm:ml-auto sm:w-auto sm:justify-end"
            >
              {FEED_FILTERS.map((filter) => {
                const selected = feedFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFeedFilter(filter.id)}
                    className={cn(
                      'shrink-0 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>

          <MarketSignalsFeed
            executives={filteredExecutives}
            news={filteredNews}
            championWatchlist={model.championWatchlist}
            activeDeals={model.activeDeals}
            initialReadKeys={model.signalReadKeys}
            senderFullName={model.senderFullName}
            referenceSnippetsByCompanyId={model.referenceSnippetsByCompanyId}
            sort={sort}
          />
        </>
      )}
    </div>
  )
}
