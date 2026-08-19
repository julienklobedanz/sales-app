'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { parseLeadershipMoveFromTitle } from '@/lib/market-signals/leadership-move'
import {
  resolveExecSignalBadge,
  resolveNewsSignalBadge,
  type MarketSignalBadge,
} from '@/lib/market-signals/signal-badge'
import {
  buildSignalMatchQuery,
  composeOutreachWithProofBlocks,
  formatReferenceProofBlock,
  type SignalMatchHit,
} from '@/lib/market-signals/signal-reference-match'
import { ROUTES } from '@/lib/routes'
import {
  MarketSignalsFeedItem,
  MarketSignalsOutreachDialog,
} from './market-signals-feed-item'
import {
  PAGE_SIZE,
  clampCompellingEvent,
  execHeadline,
  newsHeadline,
  normalizeText,
  sourceHostLabel,
  toMs,
  type FeedItem,
  type FeedSort,
} from './market-signals-feed-helpers'

export type { FeedSort }

export function MarketSignalsFeed({
  executives,
  news,
  championWatchlist,
  activeDeals,
  initialReadKeys,
  senderFullName,
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
          .map((k) => k.replace('market_irrelevant:', '')),
      ),
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
    [championWatchlist],
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
      const badge = resolveExecSignalBadge(row)
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
      const ageDays = Math.max(
        0,
        Math.floor((Date.now() - toMs(row.detectedAt)) / 86400000),
      )
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
          row.companyName,
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
      const badge: MarketSignalBadge = resolveNewsSignalBadge(row.body, row.companyName)
      const personName = moveParse.personName
      const isChampion = personName ? championSet.has(normalizeText(personName)) : false
      let relevanceScore = 0
      if (unread) relevanceScore += 40
      if (isChampion) relevanceScore += 30
      if (dealCount > 0) relevanceScore += 20
      if (badge === 'Move') relevanceScore += 15
      else relevanceScore += 5
      const ageDays = Math.max(
        0,
        Math.floor((Date.now() - toMs(row.publishedOn)) / 86400000),
      )
      relevanceScore += Math.max(0, 10 - ageDays)

      return {
        key: `news:${row.id}`,
        readKey: `market_news:${row.id}`,
        kind: 'news',
        companyId: row.companyId,
        companyName: row.companyName,
        companyLogoUrl: row.companyLogoUrl,
        at: row.publishedOn.includes('T')
          ? row.publishedOn
          : `${row.publishedOn}T12:00:00.000Z`,
        badge,
        headline: newsHeadline(row),
        compellingEvent: clampCompellingEvent(row.insightWhyNow),
        sourceLabel: sourceHostLabel(
          row.sourceUrl,
          row.sourceLabel,
          [row.insightSignalFact, row.body],
          row.companyName,
        ),
        sourceUrl: row.sourceUrl,
        personName,
        isChampion,
        dealCount,
        dealHref: dealMeta?.href ?? null,
        relevanceScore,
      }
    })

    const merged = [...execItems, ...newsItems].filter(
      (item) => !irrelevantKeys.has(item.readKey),
    )
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

  function rebuildOutreachText(
    base: string,
    matches: SignalMatchHit[],
    selectedIds: string[],
  ) {
    const selected = matches.filter((m) => selectedIds.includes(m.id))
    const blocks = selected.map(formatReferenceProofBlock)
    return composeOutreachWithProofBlocks(base, blocks)
  }

  function toggleOutreachMatch(id: string, checked: boolean) {
    setOutreachSelectedIds((prev) => {
      const next = checked
        ? [...prev.filter((x) => x !== id), id]
        : prev.filter((x) => x !== id)
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
    if (!result.success)
      toast.error(result.error ?? 'Konnte nicht als gelesen markieren.')
  }

  async function hideSignal(readKey: string) {
    const next = new Set(irrelevantKeys)
    next.add(readKey)
    setIrrelevantKeys(next)
    const result = await markMarketSignalsIrrelevant([readKey])
    if (!result.success)
      toast.error(result.error ?? 'Signal konnte nicht ausgeblendet werden.')
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
      <div className="px-6 py-10 text-center">
        <p className="font-medium text-foreground">{COPY.marketSignals.feedEmptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {COPY.marketSignals.feedEmptyBody}
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((item) => (
          <MarketSignalsFeedItem
            key={item.key}
            item={item}
            unread={!readKeys.has(item.readKey)}
            matchCount={matchesByKey[item.key]?.length ?? 0}
            onOpenOutreach={(feedItem) => void openOutreach(feedItem)}
            onHideSignal={(readKey) => void hideSignal(readKey)}
            onMarkRead={(readKey) => void markRead([readKey])}
            onCopyLink={(feedItem) => void copyLink(feedItem)}
          />
        ))}
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

      <MarketSignalsOutreachDialog
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        title={outreachTitle}
        loading={outreachLoading}
        text={outreachText}
        onTextChange={setOutreachText}
        matches={outreachMatches}
        selectedIds={outreachSelectedIds}
        baseReady={Boolean(outreachBase)}
        onToggleMatch={toggleOutreachMatch}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(outreachText)
            toast.success(COPY.marketSignals.outreachCopied)
            if (outreachReadKey) void markRead([outreachReadKey])
          } catch {
            toast.error(COPY.marketSignals.outreachFailed)
          }
        }}
      />
    </>
  )
}
