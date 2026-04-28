'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  Bell,
  Building2,
  Cancel01Icon,
  ExternalLink,
  LinkIcon,
  Linkedin01Icon,
  MailOpen,
  Sparkles,
  UploadIcon,
} from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { markMarketSignalNotificationsRead, markMarketSignalsIrrelevant } from '@/app/dashboard/market-signals/actions'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import type { ExecutiveTrackingRow, MarketSignalsCompanyOption } from '@/app/dashboard/market-signals/data'

const PAGE_SIZE = 10

function relativeTimeLabel(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffMs = Date.now() - t
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'Heute'
  if (days === 1) return 'Gestern'
  return `vor ${days} Tagen`
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function pickSignalBadge(input: { isChampionMove: boolean; detectedAt: string }) {
  if (input.isChampionMove) {
    return { label: 'Champion Move', className: 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-0' }
  }
  const isFresh = Date.now() - new Date(input.detectedAt).getTime() <= 7 * 86400000
  if (isFresh) {
    return { label: COPY.marketSignals.newBadge, className: 'bg-muted text-foreground border-0' }
  }
  return { label: 'Executive Signal', className: 'bg-muted text-muted-foreground border-0' }
}

function buildMovementSentence(input: {
  personName: string
  personTitleBefore: string | null
  personTitleAfter: string | null
  currentCompanyName: string
  changeSummary: string
}) {
  const summary = input.changeSummary.trim()
  const germanPattern = /von\s+(.+?)\s+bei\s+(.+?)\s+zu\s+(.+?)\s+bei\s+(.+)/i
  const englishPattern = /from\s+(.+?)\s+at\s+(.+?)\s+to\s+(.+?)\s+at\s+(.+)/i
  const matched = summary.match(germanPattern) ?? summary.match(englishPattern)
  if (matched) {
    const [, oldRole, oldCompany, newRole, newCompany] = matched
    return `${input.personName} wechselte von ${oldRole} bei ${oldCompany} zu ${newRole} bei ${newCompany}.`
  }

  const oldRole = input.personTitleBefore?.trim()
  const newRole = input.personTitleAfter?.trim()
  if (oldRole && newRole) {
    return `${input.personName} wechselte von ${oldRole} zu ${newRole} bei ${input.currentCompanyName}.`
  }
  if (newRole) {
    return `${input.personName} ist jetzt ${newRole} bei ${input.currentCompanyName}.`
  }
  return `${input.personName} wechselte zu ${input.currentCompanyName}.`
}

export function ExecutiveTrackingList({
  items,
  companies,
  followingCompanyIds,
  championWatchlist,
  initialReadKeys,
  restrictedCompanyIds,
}: {
  items: ExecutiveTrackingRow[]
  companies: MarketSignalsCompanyOption[]
  followingCompanyIds: string[]
  championWatchlist: string[]
  initialReadKeys: string[]
  restrictedCompanyIds?: string[]
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [readKeys, setReadKeys] = useState(() => new Set(initialReadKeys.filter((k) => k.startsWith('market_exec:'))))
  const [irrelevantKeys, setIrrelevantKeys] = useState(
    () =>
      new Set(
        initialReadKeys
          .filter((k) => k.startsWith('market_irrelevant:market_exec:'))
          .map((k) => k.replace('market_irrelevant:', ''))
      )
  )
  const followed = useMemo(() => new Set(followingCompanyIds), [followingCompanyIds])
  const championWatchSet = useMemo(() => new Set(championWatchlist), [championWatchlist])
  const companyNameById = useMemo(
    () => new Map(companies.map((company) => [company.id, normalizeText(company.name)])),
    [companies]
  )
  const deduped = useMemo(() => {
    const known = new Set<string>()
    return items.filter((row) => {
      const dayKey = String(row.detectedAt).slice(0, 10)
      const dedupeKey = [
        normalizeText(row.personName),
        normalizeText(row.personTitleBefore),
        normalizeText(row.personTitleAfter),
        normalizeText(row.changeSummary),
        dayKey,
      ].join('|')
      if (known.has(dedupeKey)) return false
      known.add(dedupeKey)
      return true
    })
  }, [items])

  const restrictedSet = useMemo(
    () => (restrictedCompanyIds?.length ? new Set(restrictedCompanyIds) : null),
    [restrictedCompanyIds]
  )

  const prioritized = useMemo(() => {
    const withScore = deduped.map((row) => {
      const summaryNorm = normalizeText(row.changeSummary)
      const mentionsFollowed = followingCompanyIds.some((companyId) => {
        const companyName = companyNameById.get(companyId)
        return companyName ? summaryNorm.includes(companyName) : false
      })
      const isChampionFollowed = championWatchSet.has(normalizeText(row.personName))
      const isChampionMove = followed.has(row.companyId) || mentionsFollowed || isChampionFollowed
      return { ...row, isChampionMove, isChampionFollowed }
    })
    const watchlistFiltered = withScore.filter(
      (row) => followed.has(row.companyId) || row.isChampionFollowed
    )
    const filtered = restrictedSet
      ? watchlistFiltered.filter((row) => restrictedSet.has(row.companyId))
      : watchlistFiltered
    return filtered.sort((a, b) => {
      if (a.isChampionMove !== b.isChampionMove) return a.isChampionMove ? -1 : 1
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    })
  }, [championWatchSet, companyNameById, deduped, followed, followingCompanyIds, restrictedSet])
  const visibleItems = prioritized.filter((row) => !irrelevantKeys.has(`market_exec:${row.id}`)).slice(0, visibleCount)
  const visibleReadKeys = useMemo(() => visibleItems.map((row) => `market_exec:${row.id}`), [visibleItems])

  async function handleMarkRead() {
    if (!visibleReadKeys.length) return
    const next = new Set(readKeys)
    visibleReadKeys.forEach((key) => next.add(key))
    setReadKeys(next)
    const result = await markMarketSignalNotificationsRead(visibleReadKeys)
    if (!result.success) toast.error(result.error ?? 'Konnte Signale nicht als gelesen markieren')
  }

  async function handleMarkIrrelevant(id: string) {
    const key = `market_exec:${id}`
    const next = new Set(irrelevantKeys)
    next.add(key)
    setIrrelevantKeys(next)
    const result = await markMarketSignalsIrrelevant([key])
    if (!result.success) toast.error(result.error ?? 'Signal konnte nicht ausgeblendet werden')
  }

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          {COPY.marketSignals.championSection}
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="toolbar"
            className="h-9 w-9 px-0 text-muted-foreground hover:bg-muted/70"
            onClick={handleMarkRead}
            aria-label="Champion Moves als gelesen markieren"
          >
            <AppIcon icon={MailOpen} size={16} />
          </Button>
          <Button variant="ghost" size="toolbar" className="h-9 px-3 text-muted-foreground hover:bg-muted/70" asChild>
            <Link href={ROUTES.settings}>
              <AppIcon icon={Bell} size={15} />
            </Link>
          </Button>
          <Button variant="ghost" size="toolbar" className="h-9 px-3 text-muted-foreground hover:bg-muted/70" asChild>
            <Link href={ROUTES.marketSignalsManage}>{COPY.marketSignals.manage}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm">
            <p className="font-medium text-foreground">{COPY.marketSignals.executiveEmptyTitle}</p>
            <p className="mt-1 text-muted-foreground">{COPY.marketSignals.executiveEmptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleItems.map((row) => {
              const badge = pickSignalBadge({ isChampionMove: row.isChampionMove, detectedAt: row.detectedAt })
              const sentence = buildMovementSentence({
                personName: row.personName,
                personTitleBefore: row.personTitleBefore,
                personTitleAfter: row.personTitleAfter,
                currentCompanyName: row.companyName,
                changeSummary: row.changeSummary,
              })
              const linkedInSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                `${row.personName} ${row.companyName}`
              )}`
              return (
                <li
                  key={row.id}
                  className={`flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-start sm:justify-between ${
                    readKeys.has(`market_exec:${row.id}`) ? 'opacity-55' : ''
                  }`}
                >
                  <div className="flex min-w-0 gap-3.5">
                    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
                      {row.companyLogoUrl ? (
                        <Image src={row.companyLogoUrl} alt="" fill sizes="40px" className="object-contain p-1.5" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {row.personName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        <span className="text-xs text-muted-foreground">{relativeTimeLabel(row.detectedAt)}</span>
                      </div>
                      <p className="text-sm font-semibold leading-snug text-foreground">{sentence}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{row.companyName}</span>
                        <span aria-hidden>•</span>
                        <span className="inline-flex items-center gap-1">
                          <AppIcon icon={Linkedin01Icon} size={14} />
                          LinkedIn
                        </span>
                        {row.changeSummary ? (
                          <span className="inline-flex items-center gap-1">
                            <AppIcon icon={ExternalLink} size={14} />
                            Signalquelle
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      title="In Deal vermerken"
                      aria-label="In Deal vermerken"
                    >
                      <AppIcon icon={UploadIcon} size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      title="Gratulieren"
                      aria-label="Gratulieren"
                      asChild
                    >
                      <Link href={linkedInSearchUrl} target="_blank" rel="noreferrer">
                        <AppIcon icon={Sparkles} size={15} />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      asChild
                    >
                      <Link href={ROUTES.accountsDetail(row.companyId)} aria-label="Zum Account">
                        <AppIcon icon={Building2} size={16} />
                      </Link>
                    </Button>
                    <div className="relative">
                      {!readKeys.has(`market_exec:${row.id}`) ? (
                        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-blue-500" />
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        title="Irrelevant"
                        aria-label="Signal als irrelevant ausblenden"
                        onClick={() => void handleMarkIrrelevant(row.id)}
                      >
                        <AppIcon icon={Cancel01Icon} size={15} />
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {prioritized.length > visibleCount ? (
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="ghost"
              size="toolbar"
              className="h-9 text-muted-foreground hover:bg-muted/70"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              <AppIcon icon={LinkIcon} size={16} />
              {COPY.marketSignals.loadMore}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
