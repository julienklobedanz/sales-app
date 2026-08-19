'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ChevronDown, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'

import {
  MarketSignalsFeed,
  type FeedSort,
} from '@/components/market-signals/market-signals-feed'
import { FilterMenuCheckboxOption } from '@/components/table/filter-menu-checkbox-option'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { triggerMarketSignalsIngestForMyOrg } from '@/app/dashboard/market-signals/actions'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { COPY } from '@/lib/copy'
import {
  newsPersonNameFromBody,
  resolveExecSignalBadge,
  resolveNewsSignalBadge,
  type MarketSignalBadge,
} from '@/lib/market-signals/signal-badge'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

type SignalTypeFilter = 'all' | MarketSignalBadge

const SIGNAL_TYPE_FILTERS: { id: SignalTypeFilter; label: string }[] = [
  { id: 'all', label: COPY.marketSignals.filterChipAll },
  { id: 'Move', label: COPY.marketSignals.filterChipMove },
  { id: 'Executive', label: COPY.marketSignals.filterChipExecutive },
  { id: 'Company', label: COPY.marketSignals.filterChipCompany },
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
  const [typeFilter, setTypeFilter] = useState<SignalTypeFilter>('all')
  const [championsOnly, setChampionsOnly] = useState(false)
  const [withDealOnly, setWithDealOnly] = useState(false)
  const [sort, setSort] = useState<FeedSort>('relevance')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [accountPickerOpen, setAccountPickerOpen] = useState(false)
  const [accountQuery, setAccountQuery] = useState('')

  const followingSet = useMemo(
    () => new Set(model.followingCompanyIds),
    [model.followingCompanyIds],
  )
  const championSet = useMemo(
    () => new Set(model.championWatchlist.map(normalizePersonKey)),
    [model.championWatchlist],
  )
  const dealCompanySet = useMemo(
    () => new Set(model.activeDealCompanyIds),
    [model.activeDealCompanyIds],
  )

  const watchedCompanies = useMemo(
    () => model.companies.filter((company) => followingSet.has(company.id)),
    [followingSet, model.companies],
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
      : (watchedCompanies.find((c) => c.id === accountFilter)?.name ??
        COPY.marketSignals.filterAccount)

  const watchlistNews = useMemo(
    () => model.news.filter((row) => followingSet.has(row.companyId)),
    [followingSet, model.news],
  )

  const watchlistExecutives = useMemo(
    () =>
      model.executives.filter(
        (row) =>
          followingSet.has(row.companyId) ||
          championSet.has(normalizePersonKey(row.personName)),
      ),
    [championSet, followingSet, model.executives],
  )

  const filteredNews = useMemo(() => {
    return watchlistNews.filter((row) => {
      if (accountFilter !== 'all' && row.companyId !== accountFilter) return false
      if (withDealOnly && !dealCompanySet.has(row.companyId)) return false
      if (
        typeFilter !== 'all' &&
        resolveNewsSignalBadge(row.body, row.companyName) !== typeFilter
      ) {
        return false
      }
      if (championsOnly) {
        const personName = newsPersonNameFromBody(row.body, row.companyName)
        if (!personName || !championSet.has(normalizePersonKey(personName))) return false
      }
      return true
    })
  }, [
    accountFilter,
    championSet,
    championsOnly,
    dealCompanySet,
    typeFilter,
    watchlistNews,
    withDealOnly,
  ])

  const filteredExecutives = useMemo(() => {
    return watchlistExecutives.filter((row) => {
      if (accountFilter !== 'all' && row.companyId !== accountFilter) return false
      if (withDealOnly && !dealCompanySet.has(row.companyId)) return false
      if (typeFilter !== 'all' && resolveExecSignalBadge(row) !== typeFilter) return false
      if (championsOnly && !championSet.has(normalizePersonKey(row.personName)))
        return false
      return true
    })
  }, [
    accountFilter,
    championSet,
    championsOnly,
    dealCompanySet,
    typeFilter,
    watchlistExecutives,
    withDealOnly,
  ])

  const hasWatchlist = model.followingCompanyIds.length > 0

  const briefingLine = useMemo(() => {
    const updated = formatLastUpdatedAt(model.lastUpdatedAt)
    const execPart = countLabel(
      watchlistExecutives.length,
      COPY.marketSignals.briefingExecCount,
      COPY.marketSignals.briefingExecCountPlural,
    )
    const companyPart = countLabel(
      watchlistNews.length,
      COPY.marketSignals.briefingCompanyCount,
      COPY.marketSignals.briefingCompanyCountPlural,
    )
    return `${COPY.marketSignals.lastUpdatedPrefix}: ${updated} · ${execPart} · ${companyPart}`
  }, [model.lastUpdatedAt, watchlistExecutives.length, watchlistNews.length])

  function handleRefresh() {
    if (isRefreshing || !hasWatchlist) return
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {COPY.nav.marketSignals}
          </h1>
          <p className="text-sm text-muted-foreground">
            {COPY.marketSignals.pageSubtitle}
          </p>
          {hasWatchlist ? (
            <p className="text-[11px] text-muted-foreground/70">{briefingLine}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 cursor-default"
            onClick={handleRefresh}
            disabled={!hasWatchlist}
            aria-busy={isRefreshing}
            aria-label={isRefreshing ? 'Feeds werden abgerufen' : 'Feeds abrufen'}
            title={isRefreshing ? 'Feeds werden abgerufen' : 'Feeds abrufen'}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 cursor-default"
            asChild
          >
            <Link
              href={ROUTES.marketSignalsManage}
              className="cursor-default"
              aria-label={COPY.marketSignals.manage}
              title={COPY.marketSignals.manage}
            >
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {!hasWatchlist ? (
        <div className="px-6 py-10 text-center">
          <p className="font-medium text-foreground">
            {COPY.marketSignals.emptyFollowingTitle}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {COPY.marketSignals.emptyFollowingBody}
          </p>
          <Button type="button" className="mt-4" asChild>
            <Link href={ROUTES.marketSignalsManage}>
              {COPY.marketSignals.emptyFollowingCta}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5">
            <Popover open={accountPickerOpen} onOpenChange={setAccountPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={COPY.marketSignals.filterAccount}
                  className="flex h-10 w-[200px] shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm shadow-sm outline-none transition-[color,box-shadow] hover:bg-card focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="min-w-0 truncate text-left">
                    {selectedAccountName}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-2">
                <Input
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  placeholder={COPY.marketSignals.filterAccountSearch}
                  className="mb-2 h-8 text-sm"
                />
                <div className="max-h-56 space-y-0.5 overflow-auto">
                  <FilterMenuCheckboxOption
                    label={COPY.marketSignals.filterAccountAll}
                    selected={accountFilter === 'all'}
                    onSelect={() => {
                      setAccountFilter('all')
                      setAccountPickerOpen(false)
                      setAccountQuery('')
                    }}
                  />
                  {accountOptions.map((company) => (
                    <FilterMenuCheckboxOption
                      key={company.id}
                      label={company.name}
                      selected={accountFilter === company.id}
                      onSelect={() => {
                        setAccountFilter(company.id)
                        setAccountPickerOpen(false)
                        setAccountQuery('')
                      }}
                    />
                  ))}
                  {accountOptions.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      Keine Treffer
                    </p>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>

            <Tabs
              value={sort}
              onValueChange={(next) => setSort(next as FeedSort)}
            >
              <TabsList aria-label="Sortierung">
              {(
                [
                  { id: 'relevance' as const, label: COPY.marketSignals.sortRelevance },
                  { id: 'date' as const, label: COPY.marketSignals.sortDate },
                ] as const
              ).map((option) => (
                <TabsTrigger key={option.id} value={option.id}>
                  {option.label}
                </TabsTrigger>
              ))}
              </TabsList>
            </Tabs>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Tabs
                value={typeFilter}
                onValueChange={(next) => setTypeFilter(next as SignalTypeFilter)}
              >
                <TabsList aria-label="Signal-Typ">
                {SIGNAL_TYPE_FILTERS.map((filter) => (
                  <TabsTrigger key={filter.id} value={filter.id}>
                    {filter.label}
                  </TabsTrigger>
                ))}
                </TabsList>
              </Tabs>

              <div
                className="inline-flex h-10 shrink-0 items-center gap-2"
                aria-label="Kontext-Filter"
              >
                {(
                  [
                    {
                      id: 'champions' as const,
                      label: COPY.marketSignals.filterContextChampions,
                      pressed: championsOnly,
                      onToggle: () => setChampionsOnly((v) => !v),
                    },
                    {
                      id: 'with_deal' as const,
                      label: COPY.marketSignals.filterContextWithDeal,
                      pressed: withDealOnly,
                      onToggle: () => setWithDealOnly((v) => !v),
                    },
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={filter.pressed}
                    onClick={filter.onToggle}
                    className={cn(
                      'inline-flex h-10 shrink-0 items-center rounded-lg border-input px-3 text-xs font-medium transition-colors',
                      filter.pressed
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground',
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
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
