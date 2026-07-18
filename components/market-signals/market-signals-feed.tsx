'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Building2, ExternalLink, MoreHorizontal } from '@hugeicons/core-free-icons'

import type {
  AccountNewsRow,
  ExecutiveTrackingRow,
  MarketSignalsPageModel,
} from '@/app/dashboard/market-signals/data'
import {
  markMarketSignalNotificationsRead,
  markMarketSignalsIrrelevant,
  matchReferencesForSignals,
} from '@/app/dashboard/market-signals/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { truncateToCompleteSentences } from '@/lib/market-signals/compelling-event'
import {
  formatSignalSourceLabel,
  isLeadershipMoveTitle,
  parseLeadershipMoveFromTitle,
} from '@/lib/market-signals/leadership-move'
import { formatRoleChangeFact } from '@/lib/market-signals/signal-intelligence'
import {
  buildSignalMatchQuery,
  composeOutreachWithProofBlocks,
  formatReferenceProofBlock,
  type SignalMatchHit,
} from '@/lib/market-signals/signal-reference-match'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

export type FeedSort = 'relevance' | 'date'

type FeedItem = {
  key: string
  readKey: string
  kind: 'exec' | 'news'
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  at: string
  badge: 'Move' | 'Executive' | 'Company'
  headline: string
  compellingEvent: string | null
  sourceLabel: string
  sourceUrl: string | null
  personName: string | null
  isChampion: boolean
  dealCount: number
  dealHref: string | null
  relevanceScore: number
}

const COMPELLING_EVENT_MAX = 180

function clampCompellingEvent(raw: string | null | undefined): string | null {
  return truncateToCompleteSentences(raw, COMPELLING_EVENT_MAX)
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

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function sourceHostLabel(
  url: string | null | undefined,
  fallback: string | null | undefined,
  hintTexts: Array<string | null | undefined> = [],
  companyName?: string | null
) {
  return formatSignalSourceLabel({
    url,
    sourceLabel: fallback,
    title: hintTexts.filter(Boolean).join(' - '),
    companyName,
  })
}

function resolveSourceUrl(url: string | null | undefined, fallbackQuery: string) {
  const raw = String(url ?? '').trim()
  if (raw && /^https?:\/\//i.test(raw)) return raw
  return `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}`
}

/** Move bei Rollenwechsel; Leadership-Titel auch ohne gespeicherte Titles → Move. */
function resolveExecBadge(row: ExecutiveTrackingRow): 'Move' | 'Executive' | 'Company' {
  const before = row.personTitleBefore?.trim()
  const after = row.personTitleAfter?.trim()
  if (before || after) return 'Move'
  if (row.eventKind === 'role_change' && row.personName?.trim()) return 'Move'
  if (
    isLeadershipMoveTitle(row.changeSummary) ||
    isLeadershipMoveTitle(row.insightSignalFact ?? '')
  ) {
    return 'Move'
  }
  if (row.eventKind === 'news_mention') {
    if (row.signalCategory === 'people') return 'Executive'
    return 'Company'
  }
  return 'Executive'
}

function execHeadline(row: ExecutiveTrackingRow) {
  const insight = row.insightSignalFact?.trim()
  if (insight) return insight
  return formatRoleChangeFact({
    personName: row.personName,
    personTitleBefore: row.personTitleBefore,
    personTitleAfter: row.personTitleAfter,
    companyName: row.companyName,
    changeSummary: row.changeSummary,
  })
}

function newsHeadline(row: AccountNewsRow) {
  const insight = row.insightSignalFact?.trim()
  if (insight) return insight
  const compact = row.body.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Neues Signal'
  if (compact.length <= 140) return compact
  return `${compact.slice(0, 137)}…`
}

function badgeClass(badge: FeedItem['badge']) {
  if (badge === 'Move') return 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-0'
  if (badge === 'Executive') return 'bg-violet-600/10 text-violet-700 dark:text-violet-300 border-0'
  return 'bg-muted text-foreground border-0'
}

function toMs(iso: string) {
  const value = iso.includes('T') ? iso : `${iso}T12:00:00.000Z`
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

export function MarketSignalsFeed({
  executives,
  news,
  championWatchlist,
  activeDeals,
  initialReadKeys,
  senderFullName,
  referenceSnippetsByCompanyId: _referenceSnippetsByCompanyId,
  sort,
}: {
  executives: ExecutiveTrackingRow[]
  news: AccountNewsRow[]
  championWatchlist: string[]
  activeDeals: MarketSignalsPageModel['activeDeals']
  initialReadKeys: string[]
  senderFullName: string | null
  referenceSnippetsByCompanyId: MarketSignalsPageModel['referenceSnippetsByCompanyId']
  sort: FeedSort
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [readKeys, setReadKeys] = useState(() => new Set(initialReadKeys))
  const [irrelevantKeys, setIrrelevantKeys] = useState(
    () =>
      new Set(
        initialReadKeys
          .filter((k) => k.startsWith('market_irrelevant:'))
          .map((k) => k.replace('market_irrelevant:', ''))
      )
  )
  const [outreachOpen, setOutreachOpen] = useState(false)
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [outreachBase, setOutreachBase] = useState('')
  const [outreachText, setOutreachText] = useState('')
  const [outreachTitle, setOutreachTitle] = useState('')
  const [outreachReadKey, setOutreachReadKey] = useState<string | null>(null)
  const [outreachMatches, setOutreachMatches] = useState<SignalMatchHit[]>([])
  const [outreachSelectedIds, setOutreachSelectedIds] = useState<string[]>([])
  const [matchesByKey, setMatchesByKey] = useState<Record<string, SignalMatchHit[]>>({})
  const [matchFetchDone, setMatchFetchDone] = useState<Set<string>>(() => new Set())

  const championSet = useMemo(
    () => new Set(championWatchlist.map(normalizeText)),
    [championWatchlist]
  )

  const dealMetaByCompany = useMemo(() => {
    const map = new Map<string, { count: number; href: string }>()
    for (const deal of activeDeals) {
      const prev = map.get(deal.companyId)
      if (!prev) {
        map.set(deal.companyId, {
          count: 1,
          href: ROUTES.deals.detail(deal.id),
        })
      } else {
        map.set(deal.companyId, {
          count: prev.count + 1,
          href: ROUTES.accountsDetail(deal.companyId),
        })
      }
    }
    return map
  }, [activeDeals])

  const items = useMemo(() => {
    const execItems: FeedItem[] = executives.map((row) => {
      const isChampion = championSet.has(normalizeText(row.personName))
      const badge = resolveExecBadge(row)
      const move = badge === 'Move'
      const dealMeta = dealMetaByCompany.get(row.companyId)
      const dealCount = dealMeta?.count ?? 0
      const unread = !readKeys.has(`market_exec:${row.id}`)
      let relevanceScore = 0
      if (unread) relevanceScore += 40
      if (isChampion) relevanceScore += 30
      if (dealCount > 0) relevanceScore += 20
      if (move) relevanceScore += 15
      else if (badge === 'Executive') relevanceScore += 8
      else relevanceScore += 5
      const ageDays = Math.max(0, Math.floor((Date.now() - toMs(row.detectedAt)) / 86400000))
      relevanceScore += Math.max(0, 10 - ageDays)

      return {
        key: `exec:${row.id}`,
        readKey: `market_exec:${row.id}`,
        kind: 'exec',
        companyId: row.companyId,
        companyName: row.companyName,
        companyLogoUrl: row.companyLogoUrl,
        at: row.detectedAt,
        badge,
        headline: execHeadline(row),
        compellingEvent: clampCompellingEvent(row.insightWhyNow),
        sourceLabel: sourceHostLabel(
          row.sourceUrl,
          null,
          [row.insightSignalFact, row.changeSummary],
          row.companyName
        ),
        sourceUrl: row.sourceUrl,
        personName: row.personName,
        isChampion,
        dealCount,
        dealHref: dealMeta?.href ?? null,
        relevanceScore,
      }
    })

    const newsItems: FeedItem[] = news.map((row) => {
      const dealMeta = dealMetaByCompany.get(row.companyId)
      const dealCount = dealMeta?.count ?? 0
      const unread = !readKeys.has(`market_news:${row.id}`)
      const moveParse = parseLeadershipMoveFromTitle(row.body, row.companyName)
      const badge: FeedItem['badge'] = moveParse.isLeadershipMove ? 'Move' : 'Company'
      const personName = moveParse.personName
      const isChampion = personName ? championSet.has(normalizeText(personName)) : false
      let relevanceScore = 0
      if (unread) relevanceScore += 40
      if (isChampion) relevanceScore += 30
      if (dealCount > 0) relevanceScore += 20
      if (badge === 'Move') relevanceScore += 15
      else relevanceScore += 5
      const ageDays = Math.max(0, Math.floor((Date.now() - toMs(row.publishedOn)) / 86400000))
      relevanceScore += Math.max(0, 10 - ageDays)

      return {
        key: `news:${row.id}`,
        readKey: `market_news:${row.id}`,
        kind: 'news',
        companyId: row.companyId,
        companyName: row.companyName,
        companyLogoUrl: row.companyLogoUrl,
        at: row.publishedOn.includes('T') ? row.publishedOn : `${row.publishedOn}T12:00:00.000Z`,
        badge,
        headline: newsHeadline(row),
        compellingEvent: clampCompellingEvent(row.insightWhyNow),
        sourceLabel: sourceHostLabel(
          row.sourceUrl,
          row.sourceLabel,
          [row.insightSignalFact, row.body],
          row.companyName
        ),
        sourceUrl: row.sourceUrl,
        personName,
        isChampion,
        dealCount,
        dealHref: dealMeta?.href ?? null,
        relevanceScore,
      }
    })

    const merged = [...execItems, ...newsItems].filter((item) => !irrelevantKeys.has(item.readKey))
    merged.sort((a, b) => {
      if (sort === 'relevance' && a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      return toMs(b.at) - toMs(a.at)
    })
    return merged
  }, [championSet, dealMetaByCompany, executives, irrelevantKeys, news, readKeys, sort])

  const visibleItems = items.slice(0, visibleCount)
  const visibleKeySig = visibleItems.map((i) => i.key).join('|')

  useEffect(() => {
    const pending = visibleItems.filter((item) => !matchFetchDone.has(item.key))
    if (!pending.length) return

    let cancelled = false

    void (async () => {
      const payload = pending.map((item) => ({
        key: item.key,
        query: buildSignalMatchQuery({
          headline: item.headline,
          compellingEvent: item.compellingEvent,
          companyName: item.companyName,
        }),
        excludeCompanyId: item.companyId,
      }))
      const result = await matchReferencesForSignals(payload)
      if (cancelled) return
      if (result.success) {
        setMatchesByKey((prev) => ({ ...prev, ...result.byKey }))
      }
      setMatchFetchDone((prev) => {
        const next = new Set(prev)
        pending.forEach((item) => next.add(item.key))
        return next
      })
    })()

    return () => {
      cancelled = true
    }
    // visibleKeySig deckt sichtbare Keys ab; matchFetchDone absichtlich nicht als Dep,
    // damit nach dem Markieren kein Loop entsteht.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- siehe Kommentar
  }, [visibleKeySig])

  function rebuildOutreachText(base: string, matches: SignalMatchHit[], selectedIds: string[]) {
    const selected = matches.filter((m) => selectedIds.includes(m.id))
    const blocks = selected.map(formatReferenceProofBlock)
    return composeOutreachWithProofBlocks(base, blocks)
  }

  function toggleOutreachMatch(id: string, checked: boolean) {
    setOutreachSelectedIds((prev) => {
      const next = checked ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)
      setOutreachText(rebuildOutreachText(outreachBase, outreachMatches, next))
      return next
    })
  }

  async function markRead(keys: string[]) {
    if (!keys.length) return
    const next = new Set(readKeys)
    keys.forEach((key) => next.add(key))
    setReadKeys(next)
    const result = await markMarketSignalNotificationsRead(keys)
    if (!result.success) toast.error(result.error ?? 'Konnte nicht als gelesen markieren.')
  }

  async function hideSignal(readKey: string) {
    const next = new Set(irrelevantKeys)
    next.add(readKey)
    setIrrelevantKeys(next)
    const result = await markMarketSignalsIrrelevant([readKey])
    if (!result.success) toast.error(result.error ?? 'Signal konnte nicht ausgeblendet werden.')
  }

  async function copyLink(item: FeedItem) {
    const href = item.sourceUrl?.trim()
    if (!href || !/^https?:\/\//i.test(href)) {
      toast.message(COPY.marketSignals.linkMissing)
      return
    }
    try {
      await navigator.clipboard.writeText(href)
      toast.success(COPY.marketSignals.linkCopied)
    } catch {
      toast.error(COPY.marketSignals.linkMissing)
    }
  }

  async function openOutreach(item: FeedItem) {
    const matches = matchesByKey[item.key] ?? []
    const defaultSelected = matches.slice(0, Math.min(2, matches.length)).map((m) => m.id)

    setOutreachTitle(item.headline)
    setOutreachBase('')
    setOutreachText('')
    setOutreachMatches(matches)
    setOutreachSelectedIds(defaultSelected)
    setOutreachReadKey(item.readKey)
    setOutreachOpen(true)
    setOutreachLoading(true)

    try {
      // Falls Matches für die Karte noch nicht geladen: jetzt nachziehen
      let resolvedMatches = matches
      if (!matchFetchDone.has(item.key)) {
        const result = await matchReferencesForSignals([
          {
            key: item.key,
            query: buildSignalMatchQuery({
              headline: item.headline,
              compellingEvent: item.compellingEvent,
              companyName: item.companyName,
            }),
            excludeCompanyId: item.companyId,
          },
        ])
        if (result.success) {
          resolvedMatches = result.byKey[item.key] ?? []
          setMatchesByKey((prev) => ({ ...prev, ...result.byKey }))
          setMatchFetchDone((prev) => new Set(prev).add(item.key))
        }
      }

      const selected =
        resolvedMatches !== matches
          ? resolvedMatches.slice(0, Math.min(2, resolvedMatches.length)).map((m) => m.id)
          : defaultSelected
      setOutreachMatches(resolvedMatches)
      setOutreachSelectedIds(selected)

      const res = await fetch('/api/market-signals/intro-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: item.headline.slice(0, 500),
          signalKind: item.kind,
          companyName: item.companyName,
          introTone: 'advisory',
          summarySnippet: (item.compellingEvent || item.headline).slice(0, 1200),
          referenceTitles: [],
          recipientFullName: item.personName,
          senderFullName,
        }),
      })
      const json = (await res.json()) as { strategy?: string; error?: string }
      if (!res.ok || !json.strategy) {
        toast.error(json.error ?? COPY.marketSignals.outreachFailed)
        setOutreachOpen(false)
        return
      }
      setOutreachBase(json.strategy)
      setOutreachText(rebuildOutreachText(json.strategy, resolvedMatches, selected))
    } catch {
      toast.error(COPY.marketSignals.outreachFailed)
      setOutreachOpen(false)
    } finally {
      setOutreachLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
        <p className="font-medium text-foreground">{COPY.marketSignals.feedEmptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{COPY.marketSignals.feedEmptyBody}</p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((item) => {
          const unread = !readKeys.has(item.readKey)
          const sourceHref = resolveSourceUrl(
            item.sourceUrl,
            [item.sourceLabel, item.companyName, item.headline].filter(Boolean).join(' ')
          )
          const dealLabel =
            item.dealCount > 0
              ? (item.dealCount === 1
                  ? COPY.marketSignals.dealCountSingular
                  : COPY.marketSignals.dealCountPlural
                ).replace('{count}', String(item.dealCount))
              : null
          const linkedInUrl = item.personName
            ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                `${item.personName} ${item.companyName}`
              )}`
            : null

          return (
            <li
              key={item.key}
              className={cn(
                'rounded-xl border p-4 shadow-sm transition-opacity',
                unread
                  ? 'border-border/70 bg-card'
                  : 'border-border/40 bg-muted/25 opacity-45'
              )}
            >
              <div className="flex gap-3.5">
                <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
                  {item.companyLogoUrl ? (
                    <Image
                      src={item.companyLogoUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-contain p-1.5"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {(item.companyName || '?').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge className={badgeClass(item.badge)}>
                        {item.badge === 'Move'
                          ? COPY.marketSignals.signalTypeMove
                          : item.badge === 'Executive'
                            ? COPY.marketSignals.signalTypeExec
                            : COPY.marketSignals.signalTypeCompany}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{relativeTimeLabel(item.at)}</span>
                    </div>
                    {unread ? (
                      <span
                        className="mt-1 size-2 shrink-0 rounded-full bg-blue-500"
                        title={COPY.marketSignals.newBadge}
                        aria-label={COPY.marketSignals.newBadge}
                      />
                    ) : null}
                  </div>

                  <p className="text-sm font-semibold leading-snug text-foreground">{item.headline}</p>

                  {item.compellingEvent ? (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {COPY.marketSignals.compellingEventLabel}:
                      </span>{' '}
                      {item.compellingEvent}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{item.companyName}</span>
                    {(() => {
                      const matchCount = matchesByKey[item.key]?.length ?? 0
                      if (matchCount <= 0) return null
                      return (
                        <>
                          <span aria-hidden>·</span>
                          <button
                            type="button"
                            className="font-medium text-foreground/80 hover:text-foreground hover:underline"
                            onClick={() => void openOutreach(item)}
                          >
                            {matchCount === 1
                              ? COPY.marketSignals.matchingRefsSingular
                              : COPY.marketSignals.matchingRefsPlural.replace(
                                  '{count}',
                                  String(matchCount)
                                )}
                          </button>
                        </>
                      )
                    })()}
                    {dealLabel && item.dealHref ? (
                      <>
                        <span aria-hidden>·</span>
                        <Link
                          href={item.dealHref}
                          className="font-medium text-foreground/80 hover:text-foreground hover:underline"
                        >
                          {dealLabel}
                        </Link>
                      </>
                    ) : null}
                    <span aria-hidden>·</span>
                    <Link
                      href={sourceHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                    >
                      {item.sourceLabel}
                      <AppIcon icon={ExternalLink} size={12} />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => void openOutreach(item)}
                    >
                      {COPY.marketSignals.outreachCta}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
                      <Link href={ROUTES.accountsDetail(item.companyId)}>
                        <AppIcon icon={Building2} size={14} className="mr-1" />
                        {COPY.marketSignals.openAccount}
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground"
                          aria-label="Weitere Aktionen"
                        >
                          <AppIcon icon={MoreHorizontal} size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void hideSignal(item.readKey)}>
                          {COPY.marketSignals.menuHide}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!unread}
                          onSelect={() => void markRead([item.readKey])}
                        >
                          {COPY.marketSignals.menuMarkRead}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void copyLink(item)}>
                          {COPY.marketSignals.menuCopyLink}
                        </DropdownMenuItem>
                        {linkedInUrl ? (
                          <DropdownMenuItem asChild>
                            <a href={linkedInUrl} target="_blank" rel="noreferrer">
                              {COPY.marketSignals.menuLinkedIn}
                            </a>
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {items.length > visibleCount ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            {COPY.marketSignals.loadMore}
          </Button>
        </div>
      ) : null}

      <Dialog open={outreachOpen} onOpenChange={setOutreachOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{COPY.marketSignals.outreachDialogTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground line-clamp-2">{outreachTitle}</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
            <Textarea
              value={outreachLoading ? COPY.marketSignals.outreachGenerating : outreachText}
              onChange={(e) => setOutreachText(e.target.value)}
              rows={14}
              disabled={outreachLoading}
              className="min-h-[280px] font-mono text-sm"
            />
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-semibold text-foreground">
                {COPY.marketSignals.outreachMatchingRefsTitle}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {COPY.marketSignals.outreachMatchingRefsHint}
              </p>
              {outreachMatches.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {COPY.marketSignals.outreachMatchingRefsEmpty}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {outreachMatches.map((hit) => {
                    const checked = outreachSelectedIds.includes(hit.id)
                    return (
                      <li key={hit.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`outreach-ref-${hit.id}`}
                          checked={checked}
                          disabled={outreachLoading || !outreachBase}
                          onCheckedChange={(value) => toggleOutreachMatch(hit.id, value === true)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`outreach-ref-${hit.id}`}
                          className="min-w-0 cursor-pointer text-xs leading-snug"
                        >
                          <span className="font-medium text-foreground">{hit.title}</span>
                          {hit.companyName ? (
                            <span className="mt-0.5 block text-muted-foreground">{hit.companyName}</span>
                          ) : null}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOutreachOpen(false)}>
              {COPY.marketSignals.outreachClose}
            </Button>
            <Button
              type="button"
              disabled={outreachLoading || !outreachText.trim()}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(outreachText)
                  toast.success(COPY.marketSignals.outreachCopied)
                  if (outreachReadKey) void markRead([outreachReadKey])
                } catch {
                  toast.error(COPY.marketSignals.outreachFailed)
                }
              }}
            >
              {COPY.marketSignals.outreachCopy}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
