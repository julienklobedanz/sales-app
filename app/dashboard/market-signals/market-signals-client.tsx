'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Delete02Icon,
  FilterHorizontalIcon,
  Linkedin01Icon,
  LinkIcon,
  Paperclip,
  Sparkles,
  UploadIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { CheckIcon } from '@/components/ui/check-icon'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  addMarketSignalToDeal,
  getDecisionMakerCandidates,
  markMarketSignalNotificationsRead,
  markMarketSignalsIrrelevant,
} from '@/app/dashboard/market-signals/actions'
import type { DecisionMakerCandidate } from '@/app/dashboard/market-signals/actions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

function formatLinkedInActivityLine(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000))
  if (days < 0) return 'Kürzlich aktiv'
  if (days === 0) return 'Heute aktiv (geschätzt)'
  if (days === 1) return 'Gestern aktiv (geschätzt)'
  if (days < 7) return `Vor ${days} Tagen aktiv (geschätzt)`
  if (days < 30) return `Vor ${Math.floor(days / 7)} Wochen aktiv (geschätzt)`
  return `Vor ${Math.floor(days / 30)} Monat(en) aktiv (geschätzt)`
}

function firstChunkSentences(text: string, maxSentences: number, maxLen: number): string {
  const t = text.trim()
  if (!t) return ''
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean)
  let out = ''
  let n = 0
  for (const p of parts) {
    if (n >= maxSentences) break
    const next = out ? `${out} ${p}` : p
    if (next.length > maxLen && out) break
    out = next
    n++
  }
  if (!out) return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t
  return out.length > maxLen ? `${out.slice(0, maxLen - 1)}…` : out
}

function computeSignalIcpScore(input: {
  item: {
    kind: 'exec' | 'news'
    companyId: string
    detectedAt?: string
    publishedOn?: string
  }
  group: { companies: { id: string }[] } | null
  quickRefs: { status: string }[]
  maxStakeholderConfidence: number
  activeDealCompanyIds: string[]
  championWatchlist: string[]
}): number {
  let score = 56
  const { item, group, quickRefs, maxStakeholderConfidence, activeDealCompanyIds, championWatchlist } = input
  if (item.kind === 'exec') score += 10
  else score += 6

  const ts = item.kind === 'exec' ? item.detectedAt : item.publishedOn
  const ageDays = ts ? (Date.now() - new Date(ts).getTime()) / (24 * 60 * 60 * 1000) : 365
  if (ageDays <= 3) score += 14
  else if (ageDays <= 14) score += 10
  else if (ageDays <= 45) score += 5
  else score += 2

  const companyIds = group?.companies.length ? group.companies.map((c) => c.id) : [item.companyId]
  if (companyIds.some((id) => activeDealCompanyIds.includes(id))) score += 9
  if (companyIds.some((id) => championWatchlist.includes(id))) score += 7

  const hasApproved = quickRefs.some((r) => String(r.status ?? '').toLowerCase() === 'approved')
  if (hasApproved) score += 9
  else if (quickRefs.length > 0) score += 4

  score += Math.round(Math.min(100, maxStakeholderConfidence) * 0.12)

  return Math.min(95, Math.max(52, score))
}

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  type IntroTone = 'challenging' | 'advisory' | 'concise'
  type InboxCategory = 'all' | 'people' | 'company'
  const [nowTs] = useState(() => new Date().getTime())
  const [onlyActiveDeals, setOnlyActiveDeals] = useState(false)
  const [onlyFocusAccounts, setOnlyFocusAccounts] = useState(true)
  const restrictedCompanyIds = useMemo(
    () => (onlyActiveDeals ? model.activeDealCompanyIds : undefined),
    [model.activeDealCompanyIds, onlyActiveDeals]
  )

  type InboxItem =
    | {
        kind: 'exec'
        id: string
        companyId: string
        companyName: string
        companyLogoUrl: string | null
        headline: string
        detectedAt: string
        sourceLabel: string
        sourceHref: string
        sourceSummary: string
        listTitlePrefix: string
        listTitleRest: string
        categoryBadge: 'people' | 'finance' | 'strategy'
        personName?: string
      }
    | {
        kind: 'news'
        id: string
        companyId: string
        companyName: string
        companyLogoUrl: string | null
        headline: string
        body: string
        publishedOn: string
        sourceLabel: string
        sourceHref: string
        sourceSummary: string
        listTitlePrefix: string
        listTitleRest: string
        categoryBadge: 'people' | 'finance' | 'strategy'
        personName?: string
      }
  type GroupCompany = { id: string; name: string; logoUrl: string | null }

  type InboxGroup = {
    key: string
    representative: InboxItem
    items: InboxItem[]
    personNames: string[]
    companies: GroupCompany[]
    sourceLabels: string[]
    latestTs: string
  }

  function signalTypeLabel(badge: InboxItem['categoryBadge']) {
    if (badge === 'people') return { short: 'Executive', full: 'Executive Tracking' }
    if (badge === 'finance') return { short: 'Finanz', full: 'Account News · Finanz' }
    return { short: 'Strategie', full: 'Account News · Strategie' }
  }

  function mergeGroupCompany(list: GroupCompany[], item: InboxItem) {
    if (!list.some((c) => c.id === item.companyId)) {
      list.push({
        id: item.companyId,
        name: item.companyName,
        logoUrl: item.companyLogoUrl,
      })
    }
  }

  function relativeTime(iso: string) {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return '—'
    const diff = Math.max(0, nowTs - t)
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'jetzt'
    if (min < 60) return `vor ${min}m`
    const h = Math.floor(min / 60)
    if (h < 24) return `vor ${h}h`
    const d = Math.floor(h / 24)
    return `vor ${d}d`
  }

  function groupLabel(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'Ältere'
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const diffDays = Math.floor((startToday - startThat) / 86400000)
    if (diffDays <= 0) return 'Heute'
    if (diffDays === 1) return 'Gestern'
    return 'Ältere'
  }

  function extractHeadline(body: string) {
    const compact = String(body ?? '').replace(/\s+/g, ' ').trim()
    if (!compact) return 'Neues Signal'
    return compact.length <= 120 ? compact : `${compact.slice(0, 117)}...`
  }

  function summarizeSourceText(raw: string) {
    const compact = String(raw ?? '').replace(/\s+/g, ' ').trim()
    if (!compact) return 'Keine Quelle verfügbar.'
    return compact.length <= 92 ? compact : `${compact.slice(0, 89)}...`
  }

  function inferNewsCategory(raw: string): 'finance' | 'strategy' {
    const t = String(raw ?? '').toLowerCase()
    if (
      /(budget|umsatz|revenue|quartal|q1|q2|q3|q4|profit|finanz|ebit|cost|invest|capex|opex)/.test(
        t
      )
    ) {
      return 'finance'
    }
    return 'strategy'
  }

  function toTitleCaseWords(input: string) {
    return input
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  function normalizeGroupingToken(input: string) {
    return String(input ?? '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function buildCompanyNewsHeadline(companyName: string, body: string) {
    const compact = String(body ?? '').replace(/\s+/g, ' ').trim()
    if (!compact) return `${companyName} • Neues Signal`

    const normalized = compact
      .replace(/[–—]/g, '-')
      .replace(/\s*-\s*/g, ' | ')
      .replace(/\s*,\s*/g, ', ')
    const rawParts = normalized
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)

    const first = rawParts[0] ?? compact
    const second = rawParts[1] ?? ''

    const quarterMatch = compact.match(/\bQ[1-4]\b/i)
    const quarter = quarterMatch ? quarterMatch[0].toUpperCase() : ''

    let trigger = first
      .replace(/\b(geplant|angekündigt|angekuendigt|läuft|laeuft|startet|gestartet)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (trigger.length > 46) trigger = `${trigger.slice(0, 43).trim()}...`
    trigger = toTitleCaseWords(trigger || 'Signal')

    let context = second || compact
    context = context
      .replace(/\b(geplant|angekündigt|angekuendigt)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (quarter && !new RegExp(`\\b${quarter}\\b`, 'i').test(context)) {
      context = `${quarter} ${context}`.trim()
    }
    if (context.length > 38) context = `${context.slice(0, 35).trim()}...`
    context = context || 'Update'

    return `${companyName} • ${trigger} (${context})`
  }

  const restrictedSet = useMemo(
    () => (restrictedCompanyIds?.length ? new Set(restrictedCompanyIds) : null),
    [restrictedCompanyIds]
  )

  const [readKeys, setReadKeys] = useState(() => new Set(model.signalReadKeys))
  const [irrelevantKeys, setIrrelevantKeys] = useState(
    () =>
      new Set(
        model.signalReadKeys
          .filter((k) => k.startsWith('market_irrelevant:'))
          .map((k) => k.replace('market_irrelevant:', ''))
      )
  )
  const [inboxCategory, setInboxCategory] = useState<InboxCategory>(() => {
    if (typeof window === 'undefined') return 'all'
    const saved = window.localStorage.getItem('market-signals-inbox-category')
    return saved === 'people' || saved === 'company' ? saved : 'all'
  })

  const items: InboxItem[] = useMemo(() => {
    const execItems: InboxItem[] = model.executives.map((row) => {
      const href = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
        `${row.personName} ${row.companyName}`
      )}`
      const headline = `${row.personName} · ${row.companyName}`
      return {
        kind: 'exec',
        id: row.id,
        companyId: row.companyId,
        companyName: row.companyName,
        companyLogoUrl: row.companyLogoUrl,
        headline,
        detectedAt: row.detectedAt,
        sourceLabel: 'LinkedIn',
        sourceHref: href,
        sourceSummary: summarizeSourceText(row.changeSummary || `${row.personName} in neuer Rolle bei ${row.companyName}`),
        listTitlePrefix: row.personName || 'Person',
        listTitleRest: `${row.companyName} · Executive Tracking`,
        categoryBadge: 'people',
        personName: row.personName,
      }
    })
    const newsItems: InboxItem[] = model.news.map((row) => {
      const source = String(row.sourceLabel ?? '').trim()
      const href = /^https?:\/\//i.test(source)
        ? source
        : `https://www.google.com/search?q=${encodeURIComponent(
            [source, row.companyName, row.body].filter(Boolean).join(' ')
          )}`
      return {
        kind: 'news',
        id: row.id,
        companyId: row.companyId,
        companyName: row.companyName,
        companyLogoUrl: row.companyLogoUrl,
        headline: buildCompanyNewsHeadline(row.companyName, row.body),
        body: row.body,
        publishedOn: row.publishedOn,
        sourceLabel: row.sourceLabel?.trim() ? String(row.sourceLabel) : 'Google News',
        sourceHref: href,
        sourceSummary: summarizeSourceText(row.body),
        listTitlePrefix: row.companyName || 'Unternehmen',
        listTitleRest: buildCompanyNewsHeadline(row.companyName, row.body).replace(
          new RegExp(`^${String(row.companyName || 'Unternehmen').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*•\\s*`),
          ''
        ),
        categoryBadge: inferNewsCategory(row.body),
        personName: undefined,
      }
    })

    const merged = [...execItems, ...newsItems]
      .filter((x) => (restrictedSet ? restrictedSet.has(x.companyId) : true))
      .filter((x) => (onlyFocusAccounts ? model.followingCompanyIds.includes(x.companyId) : true))
      .filter((x) => !irrelevantKeys.has(`${x.kind === 'exec' ? 'market_exec' : 'market_news'}:${x.id}`))
      .sort((a, b) => {
        const aT = new Date(a.kind === 'exec' ? a.detectedAt : a.publishedOn).getTime()
        const bT = new Date(b.kind === 'exec' ? b.detectedAt : b.publishedOn).getTime()
        return bT - aT
      })
    return merged
  }, [irrelevantKeys, model.executives, model.followingCompanyIds, model.news, onlyFocusAccounts, restrictedSet])

  const visibleItems = useMemo(() => {
    if (inboxCategory === 'people') return items.filter((item) => item.kind === 'exec')
    if (inboxCategory === 'company') return items.filter((item) => item.kind === 'news')
    return items
  }, [inboxCategory, items])

  const groupedVisibleItems = useMemo(() => {
    const byKey = new Map<string, InboxGroup>()
    for (const item of visibleItems) {
      const ts = item.kind === 'exec' ? item.detectedAt : item.publishedOn
      if (item.kind === 'exec') {
        const topicToken = normalizeGroupingToken(
          `${item.companyName} ${item.personName ?? ''} ${item.listTitleRest}`
        )
        const groupKey = `exec:${item.companyId}:${topicToken}`
        const existing = byKey.get(groupKey)
        if (!existing) {
          const companies: GroupCompany[] = []
          mergeGroupCompany(companies, item)
          byKey.set(groupKey, {
            key: groupKey,
            representative: item,
            items: [item],
            personNames: item.personName ? [item.personName] : [],
            companies,
            sourceLabels: [item.sourceLabel],
            latestTs: ts,
          })
          continue
        }
        existing.items.push(item)
        mergeGroupCompany(existing.companies, item)
        if (item.personName && !existing.personNames.includes(item.personName)) {
          existing.personNames.push(item.personName)
        }
        if (!existing.sourceLabels.includes(item.sourceLabel)) {
          existing.sourceLabels.push(item.sourceLabel)
        }
        if (new Date(ts).getTime() > new Date(existing.latestTs).getTime()) {
          existing.latestTs = ts
          existing.representative = item
        }
        byKey.set(groupKey, existing)
        continue
      }

      const topicToken = normalizeGroupingToken(
        `${item.listTitleRest} ${String(item.body ?? '').slice(0, 200)}`
      )
      const groupKey = `news:cluster:${topicToken}`
      const existing = byKey.get(groupKey)
      if (!existing) {
        const companies: GroupCompany[] = []
        mergeGroupCompany(companies, item)
        byKey.set(groupKey, {
          key: groupKey,
          representative: item,
          items: [item],
          personNames: [],
          companies,
          sourceLabels: [item.sourceLabel],
          latestTs: ts,
        })
        continue
      }
      existing.items.push(item)
      mergeGroupCompany(existing.companies, item)
      if (!existing.sourceLabels.includes(item.sourceLabel)) {
        existing.sourceLabels.push(item.sourceLabel)
      }
      if (new Date(ts).getTime() > new Date(existing.latestTs).getTime()) {
        existing.latestTs = ts
        existing.representative = item
      }
      byKey.set(groupKey, existing)
    }
    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.latestTs).getTime() - new Date(a.latestTs).getTime()
    )
  }, [visibleItems])

  const trendingAccounts = useMemo(() => {
    const stats = new Map<
      string,
      { companyId: string; companyName: string; companyLogoUrl: string | null; count: number; latestTs: number }
    >()
    for (const row of model.executives) {
      const ts = new Date(row.detectedAt).getTime()
      const existing = stats.get(row.companyId)
      if (!existing) {
        stats.set(row.companyId, {
          companyId: row.companyId,
          companyName: row.companyName,
          companyLogoUrl: row.companyLogoUrl,
          count: 1,
          latestTs: Number.isFinite(ts) ? ts : 0,
        })
        continue
      }
      existing.count += 1
      if (Number.isFinite(ts) && ts > existing.latestTs) existing.latestTs = ts
      stats.set(row.companyId, existing)
    }
    for (const row of model.news) {
      const ts = new Date(row.publishedOn).getTime()
      const existing = stats.get(row.companyId)
      if (!existing) {
        stats.set(row.companyId, {
          companyId: row.companyId,
          companyName: row.companyName,
          companyLogoUrl: row.companyLogoUrl,
          count: 1,
          latestTs: Number.isFinite(ts) ? ts : 0,
        })
        continue
      }
      existing.count += 1
      if (Number.isFinite(ts) && ts > existing.latestTs) existing.latestTs = ts
      stats.set(row.companyId, existing)
    }
    return Array.from(stats.values())
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.latestTs - a.latestTs))
      .slice(0, 3)
  }, [model.executives, model.news])

  const grouped = useMemo(() => {
    const buckets: Record<string, InboxGroup[]> = { Heute: [], Gestern: [], Ältere: [] }
    for (const it of groupedVisibleItems) {
      const ts = it.latestTs
      const g = groupLabel(ts)
      buckets[g] = buckets[g] ?? []
      buckets[g].push(it)
    }
    return buckets
  }, [groupedVisibleItems])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedGroup = useMemo(
    () => groupedVisibleItems.find((x) => x.key === selectedKey) ?? null,
    [groupedVisibleItems, selectedKey]
  )
  const selected = useMemo(() => selectedGroup?.representative ?? null, [selectedGroup])
  const clusterItemsForDismiss = useMemo(() => {
    if (selectedGroup?.items.length) return selectedGroup.items
    if (selected) return [selected]
    return []
  }, [selected, selectedGroup])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [addToDealPendingId, setAddToDealPendingId] = useState<string | null>(null)
  const [introTone, setIntroTone] = useState<IntroTone>('advisory')
  const [attachedRefIds, setAttachedRefIds] = useState<Set<string>>(new Set())
  const [decisionCandidatesByCompany, setDecisionCandidatesByCompany] = useState<
    Record<string, DecisionMakerCandidate[]>
  >({})
  const [decisionCandidatesLoadingCompanyId, setDecisionCandidatesLoadingCompanyId] = useState<string | null>(
    null
  )
  const [introStrategyText, setIntroStrategyText] = useState<string | null>(null)
  const [introStrategySource, setIntroStrategySource] = useState<'heuristic' | 'openai' | null>(null)
  const [introStrategyLoading, setIntroStrategyLoading] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const apply = () => setIsMobile(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!selectedKey && groupedVisibleItems.length > 0) {
      setSelectedKey(groupedVisibleItems[0].key)
      return
    }
    if (selectedKey && !groupedVisibleItems.some((item) => item.key === selectedKey)) {
      setSelectedKey(groupedVisibleItems.length > 0 ? groupedVisibleItems[0].key : null)
    }
  }, [groupedVisibleItems, selectedKey])

  useEffect(() => {
    window.localStorage.setItem('market-signals-inbox-category', inboxCategory)
  }, [inboxCategory])

  const sourcePreview = useMemo(() => {
    if (!selected) return null
    try {
      const url = new URL(selected.sourceHref)
      return {
        hostname: url.hostname.replace(/^www\./, ''),
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`,
      }
    } catch {
      return null
    }
  }, [selected])

  async function markReadForGroup(itemsToMark: InboxItem[]) {
    const keys = itemsToMark.map(
      (item) => `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
    )
    const unseen = keys.filter((key) => !readKeys.has(key))
    if (!unseen.length) return
    const next = new Set(readKeys)
    for (const key of unseen) next.add(key)
    setReadKeys(next)
    const result = await markMarketSignalNotificationsRead(unseen)
    if (!result.success) toast.error(result.error ?? 'Konnte Signal nicht als gelesen markieren')
  }

  async function dismissItems(itemsToDismiss: InboxItem[]) {
    const keys = itemsToDismiss.map(
      (item) => `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
    )
    const next = new Set(irrelevantKeys)
    for (const key of keys) next.add(key)
    setIrrelevantKeys(next)
    const result = await markMarketSignalsIrrelevant(keys)
    if (!result.success) toast.error(result.error ?? 'Signal konnte nicht archiviert werden')
  }

  async function dismissAllVisible() {
    if (!groupedVisibleItems.length) return
    const keys = groupedVisibleItems.flatMap((group) =>
      group.items.map(
      (item) => `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
      )
    )
    const next = new Set(irrelevantKeys)
    for (const key of keys) next.add(key)
    setIrrelevantKeys(next)
    const result = await markMarketSignalsIrrelevant(keys)
    if (!result.success) {
      toast.error(result.error ?? 'Signale konnten nicht archiviert werden')
      return
    }
    setSelectedKey(null)
    toast.success(`${keys.length} Signale archiviert.`)
  }

  const quickRefs = useMemo(() => {
    if (!selectedGroup?.items.length) return []
    const seen = new Set<string>()
    const out: Array<{
      id: string
      title: string
      industry: string | null
      status: string
      updatedAt: string
    }> = []
    for (const it of selectedGroup.items) {
      const snips = model.referenceSnippetsByCompanyId[it.companyId] ?? []
      for (const r of snips) {
        if (seen.has(r.id)) continue
        seen.add(r.id)
        out.push(r)
        if (out.length >= 2) return out
      }
    }
    return out
  }, [model.referenceSnippetsByCompanyId, selectedGroup])

  useEffect(() => {
    if (!selected) {
      setAttachedRefIds(new Set())
      return
    }
    setAttachedRefIds((prev) => {
      const allowed = new Set(quickRefs.map((r) => r.id))
      return new Set(Array.from(prev).filter((id) => allowed.has(id)))
    })
  }, [quickRefs, selected])

  function toggleAttachedReference(referenceId: string) {
    setAttachedRefIds((prev) => {
      const next = new Set(prev)
      if (next.has(referenceId)) next.delete(referenceId)
      else next.add(referenceId)
      return next
    })
  }

  function outreachTargetLabel(item: InboxItem, group: InboxGroup | null) {
    if (!group || group.companies.length <= 1) return item.companyName
    return group.companies.map((c) => c.name).join(', ')
  }

  function buildWhyNowOneLiner(item: InboxItem, tone: IntroTone, targetLabel: string) {
    if (item.kind === 'exec') {
      if (tone === 'challenging') {
        return `Executive-Change bei ${targetLabel} – Fenster für Neujustierung von Prioritäten und Tooling.`
      }
      if (tone === 'concise') {
        return `Executive-Wechsel bei ${targetLabel}: hohes Timing für neue Initiativen.`
      }
      return `Neue Führung bei ${targetLabel} – Momentum für lösungsorientiertes Outreach.`
    }
    if (tone === 'challenging') {
      return `Veränderungsdruck bei ${targetLabel} – guter Zeitpunkt für klare Positionierung.`
    }
    if (tone === 'concise') {
      return `Frisches Account-Signal bei ${targetLabel} – direkter Hook fürs Outreach.`
    }
    return `Account-News bei ${targetLabel} – natürlicher Einstieg ins Gespräch.`
  }

  function buildTriggerBullets(item: InboxItem, tone: IntroTone, group: InboxGroup | null) {
    const target = outreachTargetLabel(item, group)
    const bullets: string[] = []
    const fromSource = firstChunkSentences(item.sourceSummary, 2, 260)
    if (fromSource) bullets.push(fromSource)
    bullets.push(buildWhyNowOneLiner(item, tone, target))
    if (quickRefs.length) {
      const approved = quickRefs.filter((r) => String(r.status ?? '').toLowerCase() === 'approved').length
      bullets.push(
        approved > 0
          ? `${quickRefs.length} Referenz(en) im Pool, davon ${approved} öffentlich nutzbar.`
          : `${quickRefs.length} Referenz(en) – Freigabe vor externer Nutzung prüfen.`
      )
    }
    return bullets.slice(0, 3)
  }

  function buildWhyNowMessage(item: InboxItem, tone: IntroTone, targetLabel: string) {
    const refs = quickRefs.slice(0, 2).map((r) => r.title)
    const refPart = refs.length
      ? ` Mit ${refs.join(refs.length > 1 ? ' und ' : '')} haben wir belastbare Referenzen für einen schnellen Transfer bei ${targetLabel}.`
      : ` Wir sollten schnell passende Referenzen für ${targetLabel} ergänzen, um den Trigger im Outreach direkt zu kapitalisieren.`
    if (item.kind === 'exec') {
      if (tone === 'challenging') {
        return `Das Leadership-Signal öffnet ein Reframing-Fenster bei ${targetLabel}: Prioritäten werden neu gesetzt und bestehende Tools hinterfragt.${refPart}`
      }
      if (tone === 'concise') {
        return `Executive-Wechsel bei ${targetLabel} = hohes Timing-Signal für neue Initiativen.${refPart}`
      }
      return `Der Executive-Change bei ${targetLabel} schafft ein starkes Momentum für beratungsgetriebenes Outreach mit klarem Business Case.${refPart}`
    }
    if (tone === 'challenging') {
      return `Das News-Signal zeigt aktiven Veränderungsdruck bei ${targetLabel}. Jetzt ist der richtige Zeitpunkt, die Zielarchitektur und Time-to-Value offensiv zu challengen.${refPart}`
    }
    if (tone === 'concise') {
      return `Frisches Account-Signal bei ${targetLabel} mit hoher Outreach-Relevanz.${refPart}`
    }
    return `Das aktuelle Account-Signal bei ${targetLabel} bietet einen idealen Gesprächseinstieg für einen beratenden, lösungsorientierten Erstkontakt.${refPart}`
  }

  function buildIntroSnippet(item: InboxItem, group: InboxGroup | null = selectedGroup) {
    const target = outreachTargetLabel(item, group)
    const opener =
      item.kind === 'exec'
        ? `${item.listTitlePrefix} ist bei ${item.companyName} in einer neuen Rolle.`
        : group && group.companies.length > 1
          ? `Mehrere Accounts (${group.companies.length}) mit gleichem Signal: ${item.listTitleRest}.`
          : `${item.companyName} sendet ein relevantes Signal: ${item.listTitleRest}.`
    return `${opener} ${buildWhyNowMessage(item, 'concise', target)}`
  }

  function readinessForReference(status: string): {
    legalBadgeLabel: string
    legalBadgeClassName: string
    dotClass: string
    detailHint: string
  } {
    const s = String(status ?? '').toLowerCase()
    if (s === 'approved') {
      return {
        legalBadgeLabel: 'Öffentlich freigegeben',
        legalBadgeClassName:
          'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100',
        dotClass: 'bg-emerald-500',
        detailHint: 'Logo und Nennung extern erlaubt.',
      }
    }
    if (s === 'anonymized') {
      return {
        legalBadgeLabel: 'Nur anonym nutzen',
        legalBadgeClassName:
          'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
        dotClass: 'bg-amber-400',
        detailHint: 'Kein Firmenname/Logo nach außen – nur anonyme Formulierungen.',
      }
    }
    return {
      legalBadgeLabel: 'Nicht extern freigegeben',
      legalBadgeClassName:
        'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
      dotClass: 'bg-red-500',
      detailHint: 'Nur intern – nicht im Kundenkontext verwenden.',
    }
  }

  useEffect(() => {
    if (!selected) return
    if (decisionCandidatesByCompany[selected.companyId]) return
    let cancelled = false
    setDecisionCandidatesLoadingCompanyId(selected.companyId)
    ;(async () => {
      const result = await getDecisionMakerCandidates({
        companyId: selected.companyId,
        signalKind: selected.kind,
      })
      if (cancelled) return
      setDecisionCandidatesLoadingCompanyId(null)
      if (!result.success) {
        toast.error(result.error ?? 'Decision-Maker konnten nicht geladen werden.')
        return
      }
      setDecisionCandidatesByCompany((prev) => ({ ...prev, [selected.companyId]: result.candidates }))
    })()
    return () => {
      cancelled = true
    }
  }, [decisionCandidatesByCompany, selected])

  const decisionCandidates = useMemo(
    () => (selected ? decisionCandidatesByCompany[selected.companyId] ?? [] : []),
    [decisionCandidatesByCompany, selected]
  )

  const mutualConnectionsPreview = useMemo(() => {
    if (!decisionCandidates.length) return { count: 0, bridges: [] as string[] }
    let max = 0
    const bridgeSet = new Set<string>()
    for (const c of decisionCandidates) {
      const m = c.mutualConnections ?? 0
      if (m > max) max = m
      for (const b of c.mutualConnectionBridges ?? []) bridgeSet.add(b)
    }
    return { count: max, bridges: Array.from(bridgeSet) }
  }, [decisionCandidates])

  const maxStakeholderConfidence = useMemo(
    () => (decisionCandidates.length ? Math.max(...decisionCandidates.map((c) => c.confidence)) : 0),
    [decisionCandidates]
  )

  const signalIcpScore = useMemo(() => {
    if (!selected) return null
    return computeSignalIcpScore({
      item: selected,
      group: selectedGroup,
      quickRefs,
      maxStakeholderConfidence,
      activeDealCompanyIds: model.activeDealCompanyIds,
      championWatchlist: model.championWatchlist,
    })
  }, [
    selected,
    selectedGroup,
    quickRefs,
    maxStakeholderConfidence,
    model.activeDealCompanyIds,
    model.championWatchlist,
  ])

  const triggerBullets = useMemo(() => {
    if (!selected) return []
    return buildTriggerBullets(selected, introTone, selectedGroup)
  }, [selected, introTone, selectedGroup, quickRefs])

  useEffect(() => {
    if (!selected) {
      setIntroStrategyText(null)
      setIntroStrategySource(null)
      setIntroStrategyLoading(false)
      return
    }
    const ac = new AbortController()
    setIntroStrategyLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/market-signals/intro-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headline: selected.headline,
            signalKind: selected.kind,
            companyName: selected.companyName,
            introTone,
            summarySnippet: selected.sourceSummary.slice(0, 1200),
            referenceTitles: quickRefs.map((r) => r.title),
          }),
          signal: ac.signal,
        })
        if (!res.ok) throw new Error('strategy failed')
        const data = (await res.json()) as { strategy?: string; source?: string }
        if (ac.signal.aborted) return
        setIntroStrategyText(data.strategy ?? null)
        setIntroStrategySource(data.source === 'openai' ? 'openai' : 'heuristic')
      } catch {
        if (ac.signal.aborted) return
        setIntroStrategyText(null)
        setIntroStrategySource(null)
      } finally {
        if (!ac.signal.aborted) setIntroStrategyLoading(false)
      }
    })()
    return () => ac.abort()
  }, [selected, introTone, quickRefs])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-slate-900/5">
        <div className="inline-flex items-center rounded-lg border border-border/70 bg-background/70 p-1">
          <Button
            type="button"
            variant="ghost"
            size="toolbar"
            onClick={() => setOnlyActiveDeals((prev) => !prev)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium ${
              onlyActiveDeals
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-blue-300'
                : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <AppIcon icon={FilterHorizontalIcon} size={14} />
            Nur aktive Deals
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="toolbar"
            onClick={() => setOnlyFocusAccounts((prev) => !prev)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium ${
              onlyFocusAccounts
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-blue-300'
                : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <AppIcon icon={FilterHorizontalIcon} size={14} />
            Nur Fokus-Accounts
          </Button>
          <Button variant="ghost" size="toolbar" className="h-8 px-3 text-muted-foreground hover:bg-muted/70" asChild>
            <Link href={`${ROUTES.marketSignalsManage}?view=champions`}>
              <AppIcon icon={Sparkles} size={14} />
              Executives verwalten
            </Link>
          </Button>
          <Button variant="ghost" size="toolbar" className="h-8 px-3 text-muted-foreground hover:bg-muted/70" asChild>
            <Link href={ROUTES.marketSignalsManage}>Watchlist verwalten</Link>
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-220px)] min-h-[540px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35} minSize={28} className="min-w-[280px]">
            <div className="h-full overflow-hidden">
              <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3">
                <p className="text-sm font-semibold text-slate-900">Inbox</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-slate-500">
                    {groupedVisibleItems.length} Gruppen
                    {groupedVisibleItems.length !== visibleItems.length
                      ? ` · ${visibleItems.length} Signale`
                      : ''}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-500 hover:text-slate-700"
                    onClick={() => void dismissAllVisible()}
                    disabled={groupedVisibleItems.length === 0}
                    aria-label="Alle sichtbaren Signale archivieren"
                    title="Alle sichtbaren Signale archivieren"
                  >
                    <AppIcon icon={Delete02Icon} size={14} />
                  </Button>
                </div>
              </div>
              <div className="border-b border-slate-200 bg-white px-2 py-1.5">
                <div className="inline-flex w-full items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={inboxCategory === 'all' ? 'secondary' : 'ghost'}
                    className="h-7 flex-1 text-xs"
                    onClick={() => setInboxCategory('all')}
                  >
                    Alle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={inboxCategory === 'people' ? 'secondary' : 'ghost'}
                    className="h-7 flex-1 text-xs"
                    onClick={() => setInboxCategory('people')}
                  >
                    Personen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={inboxCategory === 'company' ? 'secondary' : 'ghost'}
                    className="h-7 flex-1 text-xs"
                    onClick={() => setInboxCategory('company')}
                  >
                    Company
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-6.25rem)] overflow-y-auto p-2">
                {groupedVisibleItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-slate-900">You&apos;re all caught up</p>
                      <p className="mt-1 text-xs text-slate-500">Keine neuen Signale in deiner Watchlist.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(['Heute', 'Gestern', 'Ältere'] as const).map((label) =>
                      (grouped[label] ?? []).length ? (
                        <div key={label} className="space-y-2">
                          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                          </p>
                          <ul className="space-y-1">
                            {(grouped[label] ?? []).map((groupItem) => {
                              const rep = groupItem.representative
                              const key = groupItem.key
                              const isActive = key === selectedKey
                              const readKeysForGroup = groupItem.items.map(
                                (item) => `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
                              )
                              const allRead = readKeysForGroup.every((rk) => readKeys.has(rk))
                              const ts = groupItem.latestTs
                              const typeMeta = signalTypeLabel(rep.categoryBadge)
                              const leftBorderClass =
                                rep.categoryBadge === 'people'
                                  ? 'bg-blue-600'
                                  : rep.categoryBadge === 'finance'
                                    ? 'bg-emerald-600'
                                    : 'bg-amber-500'
                              const displayPrefix =
                                rep.kind === 'news' && groupItem.companies.length > 1
                                  ? `${groupItem.companies.length} Accounts`
                                  : rep.listTitlePrefix
                              const listAria = `${typeMeta.full}. ${displayPrefix} · ${rep.listTitleRest}`
                              return (
                                <li key={key}>
                                  <button
                                    type="button"
                                    aria-label={listAria}
                                    onClick={() => {
                                      setSelectedKey(key)
                                      if (isMobile) setMobileOpen(true)
                                      void markReadForGroup(groupItem.items)
                                    }}
                                    className={`group relative flex w-full items-center gap-2 rounded-lg border bg-white py-2 pl-2.5 pr-1 text-left transition-colors ${
                                      isActive
                                        ? 'border-blue-200 bg-blue-50'
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className={`absolute left-0 top-0 h-full w-1.5 rounded-l-lg ${leftBorderClass}`}
                                      aria-hidden
                                    />
                                    <div className="relative flex shrink-0 -space-x-1.5">
                                      {groupItem.companies.length > 1
                                        ? groupItem.companies.slice(0, 3).map((co) => (
                                            <div
                                              key={co.id}
                                              className="relative z-10 size-7 overflow-hidden rounded-md border border-white bg-white ring-1 ring-slate-200"
                                            >
                                              {co.logoUrl ? (
                                                <Image
                                                  src={co.logoUrl}
                                                  alt=""
                                                  width={28}
                                                  height={28}
                                                  className="size-7 object-contain p-1"
                                                />
                                              ) : null}
                                            </div>
                                          ))
                                        : rep.companyLogoUrl ? (
                                            <div className="relative size-7 overflow-hidden rounded-md border border-slate-200 bg-white">
                                              <Image
                                                src={rep.companyLogoUrl}
                                                alt=""
                                                fill
                                                sizes="28px"
                                                className="object-contain p-1"
                                              />
                                            </div>
                                          ) : (
                                            <div className="size-7 rounded-md border border-slate-200 bg-white" />
                                          )}
                                      {groupItem.companies.length > 3 ? (
                                        <span className="z-20 inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[9px] font-semibold text-slate-600">
                                          +{groupItem.companies.length - 3}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex min-w-0 items-center gap-1.5">
                                        <span
                                          className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-slate-700"
                                          title={typeMeta.full}
                                        >
                                          {typeMeta.short}
                                        </span>
                                        <p className="min-w-0 truncate text-xs text-slate-900">
                                          <span className="font-semibold">{displayPrefix}</span>
                                          <span className="text-slate-700"> • {rep.listTitleRest}</span>
                                        </p>
                                      </div>
                                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{rep.sourceSummary}</p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">{relativeTime(ts)}</p>
                                      {groupItem.personNames.length > 1 ? (
                                        <div className="mt-1 flex items-center gap-1">
                                          {groupItem.personNames.slice(0, 4).map((person) => (
                                            <span
                                              key={person}
                                              className="inline-flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-medium text-slate-600"
                                              title={person}
                                            >
                                              {person
                                                .split(' ')
                                                .filter(Boolean)
                                                .slice(0, 2)
                                                .map((x) => x[0]?.toUpperCase() ?? '')
                                                .join('')}
                                            </span>
                                          ))}
                                          {groupItem.personNames.length > 4 ? (
                                            <span className="text-[10px] text-slate-500">
                                              +{groupItem.personNames.length - 4}
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="relative shrink-0">
                                      {!allRead ? (
                                        <span className="absolute -left-2 top-1/2 size-2 -translate-y-1/2 rounded-full bg-blue-500" />
                                      ) : null}
                                      <div className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 translate-x-3 items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-1 py-0.5 opacity-0 shadow-sm transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
                                        <button
                                          type="button"
                                          className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                          aria-label="Archivieren"
                                          title="Archivieren"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            void dismissItems(groupItem.items)
                                          }}
                                        >
                                          <CheckIcon className="size-4" />
                                        </button>
                                        <button
                                          type="button"
                                          className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                          aria-label="AI-Snippet kopieren"
                                          title="AI-Snippet kopieren"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            void navigator.clipboard.writeText(buildIntroSnippet(rep, groupItem))
                                            toast.success('AI-Intro-Snippet kopiert.')
                                          }}
                                        >
                                          <AppIcon icon={Sparkles} size={14} />
                                        </button>
                                        <span className="inline-flex size-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600">
                                        {rep.categoryBadge === 'people' ? (
                                          <AppIcon icon={UserMultipleIcon} size={13} className="text-blue-600" />
                                        ) : rep.categoryBadge === 'finance' ? (
                                          <span className="inline-flex size-3 rounded-sm bg-emerald-500" />
                                        ) : (
                                          <span className="inline-flex size-2.5 rotate-45 rounded-[1px] bg-amber-400" />
                                        )}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={65} minSize={40} className="hidden lg:block">
            <div className="relative h-full overflow-hidden bg-white">
              <div className="h-full border-l border-slate-200">
                {!selected ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      {groupedVisibleItems.length === 0 ? (
                        <>
                          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CheckIcon className="size-5" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-900">Inbox Zero erreicht</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Stark! Keine offenen Signale mehr. Hier sind die Top Trending Accounts als nächster Fokus.
                          </p>
                          <div className="mt-4 space-y-2 text-left">
                            {trendingAccounts.length === 0 ? (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                Aktuell keine Trending Accounts verfügbar.
                              </div>
                            ) : (
                              trendingAccounts.map((account) => (
                                <Link
                                  key={account.companyId}
                                  href={ROUTES.accountsDetail(account.companyId)}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                                >
                                  <span className="truncate font-medium text-slate-900">{account.companyName}</span>
                                  <span className="shrink-0 text-slate-500">{account.count} Signale</span>
                                </Link>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <AppIcon icon={Sparkles} size={18} />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-900">Kein Signal ausgewählt</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Wähle ein Signal aus, um Details und passende Referenzen zu sehen.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="relative mt-0.5 flex shrink-0 -space-x-2">
                            {selectedGroup && selectedGroup.companies.length > 1
                              ? selectedGroup.companies.slice(0, 4).map((co) => (
                                  <div
                                    key={co.id}
                                    className="relative z-10 size-10 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm ring-1 ring-slate-200"
                                  >
                                    {co.logoUrl ? (
                                      <Image
                                        src={co.logoUrl}
                                        alt=""
                                        width={40}
                                        height={40}
                                        className="size-10 object-contain p-1.5"
                                      />
                                    ) : null}
                                  </div>
                                ))
                              : selected.companyLogoUrl ? (
                                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <Image
                                      src={selected.companyLogoUrl}
                                      alt=""
                                      fill
                                      sizes="40px"
                                      className="object-contain p-1.5"
                                    />
                                  </div>
                                ) : (
                                  <div className="size-10 shrink-0 rounded-xl border border-slate-200 bg-white" />
                                )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{selected.headline}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                              <span>
                                {selectedGroup && selectedGroup.companies.length > 1
                                  ? `${selectedGroup.companies.length} Accounts`
                                  : selected.companyName}
                              </span>
                              <span aria-hidden>•</span>
                              <span
                                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                                title={signalTypeLabel(selected.categoryBadge).full}
                              >
                                {signalTypeLabel(selected.categoryBadge).short}
                              </span>
                              <span aria-hidden>•</span>
                              <Link
                                href={selected.sourceHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex max-w-[min(14rem,42vw)] shrink-0 items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline"
                                title={
                                  sourcePreview?.hostname
                                    ? `${selected.sourceLabel} · ${sourcePreview.hostname}`
                                    : selected.sourceLabel
                                }
                                aria-label={`Quelle öffnen: ${selected.sourceLabel}`}
                              >
                                <AppIcon icon={LinkIcon} size={12} className="shrink-0" />
                                <span className="truncate">via {selected.sourceLabel}</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={ROUTES.accountsDetail(selected.companyId)}>
                            {selectedGroup && selectedGroup.companies.length > 1 ? 'Lead-Account' : 'Zum Account'}
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trigger</p>
                              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                                Kurzfassung & Relevanz — Ton über die Buttons unten.
                              </p>
                            </div>
                            {signalIcpScore !== null ? (
                              <div
                                className="flex shrink-0 flex-col items-end text-right"
                                title="Schätzung aus Signal-Typ, Aktualität, Fokus-Accounts, aktiven Deals, Referenz-Freigaben und Stakeholder-Match. Konfigurierbare ICP-Regeln folgen."
                              >
                                <span className="text-2xl font-bold tabular-nums text-slate-900">{signalIcpScore}%</span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                  ICP-Relevanz
                                </span>
                              </div>
                            ) : null}
                          </div>
                          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm leading-snug text-slate-700 marker:text-slate-400">
                            {triggerBullets.map((line, i) => (
                              <li key={i} className="pl-0.5">
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm shadow-slate-900/5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Stakeholder</p>
                            <span className="text-[11px] text-slate-500">Lead-Account · Rollen · Ranking</span>
                          </div>
                          {decisionCandidatesLoadingCompanyId === selected.companyId ? (
                            <p className="mt-3 text-sm text-slate-500">Profile werden geladen …</p>
                          ) : decisionCandidates.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">
                              Noch keine Vorschläge. Verbinde The Org, CIO.de oder LinkedIn/Sales Navigator.
                            </p>
                          ) : (
                            <ul className="mt-3 space-y-3">
                              {decisionCandidates.map((candidate) => {
                                const activity = formatLinkedInActivityLine(candidate.lastSeenAt)
                                return (
                                  <li
                                    key={candidate.id}
                                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-base font-semibold text-slate-900">{candidate.fullName}</p>
                                      <p className="truncate text-sm text-slate-600">{candidate.title}</p>
                                      {activity ? (
                                        <p className="mt-1 text-xs text-slate-600">
                                          <span className="font-medium text-slate-700">LinkedIn</span>
                                          <span className="text-slate-400"> · </span>
                                          {activity}
                                        </p>
                                      ) : null}
                                      <p className="mt-1.5 text-xs leading-snug text-slate-500">{candidate.confidenceReason}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                                        {candidate.confidence}%
                                      </span>
                                      {candidate.profileUrl ? (
                                        <Button size="sm" variant="outline" asChild>
                                          <Link href={candidate.profileUrl} target="_blank" rel="noreferrer">
                                            <AppIcon icon={UserMultipleIcon} size={14} />
                                            Profil
                                          </Link>
                                        </Button>
                                      ) : null}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passende Referenzen</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Nutze nur Referenzen mit passender Freigabe — Badge vor dem Outreach prüfen.
                        </p>
                        {quickRefs.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">
                            Noch keine Referenzen für die betroffenen Accounts gefunden.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {quickRefs.slice(0, 2).map((r) => {
                              const readiness = readinessForReference(r.status)
                              const attached = attachedRefIds.has(r.id)
                              return (
                                <li
                                  key={r.id}
                                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline" className={`text-[11px] font-semibold ${readiness.legalBadgeClassName}`}>
                                        {readiness.legalBadgeLabel}
                                      </Badge>
                                    </div>
                                    <p className="mt-1.5 truncate text-sm font-medium text-slate-900">{r.title}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {r.industry ?? '—'} · {r.status}
                                    </p>
                                    <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-600">
                                      <span className={`mt-0.5 inline-flex size-2 shrink-0 rounded-full ${readiness.dotClass}`} />
                                      <span>{readiness.detailHint}</span>
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-stretch md:flex-row md:items-center">
                                    <Button
                                      size="icon"
                                      variant={attached ? 'default' : 'outline'}
                                      className={attached ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                      onClick={() => toggleAttachedReference(r.id)}
                                      aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                      title={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                    >
                                      <AppIcon icon={Paperclip} size={14} />
                                    </Button>
                                    <Button size="sm" variant="outline" asChild>
                                      <Link href={ROUTES.evidence.detail(r.id)}>Öffnen</Link>
                                    </Button>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-3">
                      <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/25">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
                            Nächster Schritt (Strategie)
                          </p>
                          {introStrategySource === 'openai' ? (
                            <Badge className="h-5 px-1.5 text-[10px]">KI</Badge>
                          ) : introStrategySource ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              Regeln
                            </Badge>
                          ) : null}
                        </div>
                        {introStrategyLoading ? (
                          <p className="mt-1 text-xs text-slate-600">Empfehlung wird geladen …</p>
                        ) : introStrategyText ? (
                          <p className="mt-1 text-sm leading-snug text-slate-800 dark:text-slate-100">{introStrategyText}</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">Keine Empfehlung verfügbar.</p>
                        )}
                      </div>
                      <div className="mb-2.5 flex flex-wrap items-center justify-end gap-1.5">
                        {([
                          ['challenging', 'Herausfordernd'],
                          ['advisory', 'Beratend'],
                          ['concise', 'Kurz & Knapp'],
                        ] as const).map(([value, label]) => (
                          <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={introTone === value ? 'secondary' : 'ghost'}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setIntroTone(value)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            asChild
                          >
                            <Link
                              href={
                                selected.kind === 'exec'
                                  ? selected.sourceHref
                                  : `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
                                      selected.companyName
                                    )}`
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              <AppIcon icon={Linkedin01Icon} size={16} />
                              Auf LinkedIn öffnen
                            </Link>
                          </Button>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                                  aria-label="Gemeinsame Kontakte und Warm-Intro-Pfade"
                                >
                                  <span className="inline-flex items-center -space-x-1.5" aria-hidden>
                                    <AppIcon icon={UserMultipleIcon} size={15} className="text-slate-600" />
                                    <AppIcon icon={UserMultipleIcon} size={15} className="text-slate-500" />
                                  </span>
                                  {mutualConnectionsPreview.count > 0 ? (
                                    <span className="font-medium tabular-nums text-slate-800 dark:text-slate-100">
                                      {mutualConnectionsPreview.count}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              >
                                <p className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                                  Gemeinsame Kontakte
                                </p>
                                {mutualConnectionsPreview.bridges.length ? (
                                  <ul className="list-inside list-disc space-y-1 leading-snug text-slate-700 dark:text-slate-300">
                                    {mutualConnectionsPreview.bridges.map((line, i) => (
                                      <li key={i}>{line}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="leading-snug text-slate-600 dark:text-slate-400">
                                    Noch keine gematchten Pfade. Mit LinkedIn/Sales Navigator erscheinen hier konkrete
                                    Warm-Intro-Ideen (z. B. welcher Kollege wen kennt).
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="gap-2">
                                <AppIcon icon={UploadIcon} size={16} />
                                Zu Deal hinzufügen
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {model.activeDeals.length === 0 ? (
                                <DropdownMenuItem disabled>Keine aktiven Deals</DropdownMenuItem>
                              ) : (
                                model.activeDeals.slice(0, 12).map((d) => (
                                  <DropdownMenuItem
                                    key={d.id}
                                    disabled={addToDealPendingId === d.id}
                                    onSelect={async () => {
                                      if (!selected) return
                                      setAddToDealPendingId(d.id)
                                      const signalKey = `${selected.kind === 'exec' ? 'market_exec' : 'market_news'}:${selected.id}`
                                      const res = await addMarketSignalToDeal({
                                        dealId: d.id,
                                        companyId: selected.companyId,
                                        signalKey,
                                        referenceIds: (quickRefs ?? []).map((r) => r.id),
                                      })
                                      setAddToDealPendingId(null)
                                      if (!res.success) {
                                        toast.error(res.error)
                                        return
                                      }
                                      toast.success(
                                        res.added > 0
                                          ? `Zu Deal hinzugefügt: ${res.added} Referenz${res.added === 1 ? '' : 'en'}`
                                          : 'Zum Deal hinzugefügt',
                                        {
                                          action: {
                                            label: 'Deal öffnen',
                                            onClick: () => {
                                              window.location.href = ROUTES.deals.detail(d.id)
                                            },
                                          },
                                        }
                                      )
                                      await dismissItems(clusterItemsForDismiss)
                                      setSelectedKey(null)
                                    }}
                                  >
                                    {d.title}
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              toast.success(
                                attachedRefIds.size > 0
                                  ? `Intro-Draft wird generiert (${attachedRefIds.size} Referenz${attachedRefIds.size === 1 ? '' : 'en'} angehängt, Ton: ${
                                      introTone === 'challenging'
                                        ? 'Herausfordernd'
                                        : introTone === 'concise'
                                          ? 'Kurz & Knapp'
                                          : 'Beratend'
                                    }).`
                                  : `Intro-Draft wird generiert (Ton: ${
                                      introTone === 'challenging'
                                        ? 'Herausfordernd'
                                        : introTone === 'concise'
                                          ? 'Kurz & Knapp'
                                          : 'Beratend'
                                    }).`
                              )
                            }
                          >
                            <AppIcon icon={Sparkles} size={16} />
                            Intro-Draft generieren
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile detail drawer (fullscreen dialog) */}
      <Dialog
        open={mobileOpen && Boolean(selected)}
        onOpenChange={(open) => setMobileOpen(open)}
      >
        <DialogContent className="max-w-none h-[100dvh] w-[100vw] rounded-none p-0 sm:max-w-none">
          <DialogTitle className="sr-only">Signal Details</DialogTitle>
          <div className="flex h-full flex-col overflow-hidden bg-white">
            <div className="shrink-0 border-b border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {selected && selectedGroup && selectedGroup.companies.length > 1 ? (
                    <div className="relative mt-0.5 flex shrink-0 -space-x-1.5">
                      {selectedGroup.companies.slice(0, 4).map((co) => (
                        <div
                          key={co.id}
                          className="relative z-10 size-8 overflow-hidden rounded-lg border-2 border-white bg-white shadow-sm ring-1 ring-slate-200"
                        >
                          {co.logoUrl ? (
                            <Image
                              src={co.logoUrl}
                              alt=""
                              width={32}
                              height={32}
                              className="size-8 object-contain p-1"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : selected?.companyLogoUrl ? (
                    <div className="relative mt-0.5 size-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <Image src={selected.companyLogoUrl} alt="" fill sizes="32px" className="object-contain p-1" />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{selected?.headline ?? 'Signal'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-500">
                      {selected && selectedGroup && selectedGroup.companies.length > 1 ? (
                        <span>{selectedGroup.companies.length} Accounts</span>
                      ) : (
                        <span>{selected?.companyName ?? ''}</span>
                      )}
                      {selected ? (
                        <>
                          <span aria-hidden>•</span>
                          <span
                            className="rounded border border-slate-200 bg-slate-50 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                            title={signalTypeLabel(selected.categoryBadge).full}
                          >
                            {signalTypeLabel(selected.categoryBadge).short}
                          </span>
                          <span aria-hidden>•</span>
                          <Link
                            href={selected.sourceHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-[min(11rem,55vw)] items-center gap-0.5 font-medium text-blue-700 hover:underline"
                            title={
                              sourcePreview?.hostname
                                ? `${selected.sourceLabel} · ${sourcePreview.hostname}`
                                : selected.sourceLabel
                            }
                            aria-label={`Quelle öffnen: ${selected.sourceLabel}`}
                          >
                            <AppIcon icon={LinkIcon} size={12} className="shrink-0" />
                            <span className="truncate">via {selected.sourceLabel}</span>
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                {selected ? (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href={ROUTES.accountsDetail(selected.companyId)}>
                      {selectedGroup && selectedGroup.companies.length > 1 ? 'Lead-Account' : 'Zum Account'}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {selected ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trigger</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">Kurzfassung · Ton unten wählbar</p>
                      </div>
                      {signalIcpScore !== null ? (
                        <div
                          className="text-right"
                          title="Schätzung aus Signal-Typ, Aktualität, Fokus-Accounts, Deals, Referenzen und Stakeholder-Match. ICP-Regeln folgen."
                        >
                          <span className="text-xl font-bold tabular-nums text-slate-900">{signalIcpScore}%</span>
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">ICP-Relevanz</p>
                        </div>
                      ) : null}
                    </div>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] leading-snug text-slate-700 marker:text-slate-400">
                      {triggerBullets.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 rounded-xl border-2 border-blue-100 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Stakeholder</p>
                      <span className="text-[10px] text-slate-500">Lead-Account</span>
                    </div>
                    {decisionCandidatesLoadingCompanyId === selected.companyId ? (
                      <p className="mt-2 text-sm text-slate-500">Profile werden geladen …</p>
                    ) : decisionCandidates.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch keine Vorschläge. Verbinde The Org, CIO.de oder LinkedIn/Sales Navigator.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {decisionCandidates.map((candidate) => {
                          const activity = formatLinkedInActivityLine(candidate.lastSeenAt)
                          return (
                            <li
                              key={candidate.id}
                              className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{candidate.fullName}</p>
                                <p className="truncate text-xs text-slate-600">{candidate.title}</p>
                                {activity ? (
                                  <p className="mt-1 text-[11px] text-slate-600">
                                    <span className="font-medium text-slate-700">LinkedIn</span>
                                    <span className="text-slate-400"> · </span>
                                    {activity}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-[11px] leading-snug text-slate-500">{candidate.confidenceReason}</p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                                  {candidate.confidence}%
                                </span>
                                {candidate.profileUrl ? (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                                    <Link href={candidate.profileUrl} target="_blank" rel="noreferrer">
                                      Profil
                                    </Link>
                                  </Button>
                                ) : null}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passende Referenzen</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Freigabe vor dem Kundenkontakt prüfen.</p>
                    {quickRefs.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch keine Referenzen für die betroffenen Accounts gefunden.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {quickRefs.slice(0, 2).map((r) => {
                          const readiness = readinessForReference(r.status)
                          const attached = attachedRefIds.has(r.id)
                          return (
                            <li
                              key={r.id}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                            >
                              <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                {readiness.legalBadgeLabel}
                              </Badge>
                              <p className="mt-1.5 truncate text-sm font-medium text-slate-900">{r.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {r.industry ?? '—'} · {r.status}
                              </p>
                              <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-600">
                                <span className={`mt-0.5 inline-flex size-2 shrink-0 rounded-full ${readiness.dotClass}`} />
                                <span>{readiness.detailHint}</span>
                              </p>
                              <div className="mt-2 flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant={attached ? 'default' : 'outline'}
                                  className={`size-8 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                  onClick={() => toggleAttachedReference(r.id)}
                                  aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                >
                                  <AppIcon icon={Paperclip} size={14} />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 px-2 text-xs" asChild>
                                  <Link href={ROUTES.evidence.detail(r.id)}>Öffnen</Link>
                                </Button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            {selected ? (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/25">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
                      Nächster Schritt (Strategie)
                    </p>
                    {introStrategySource === 'openai' ? (
                      <Badge className="h-5 px-1.5 text-[10px]">KI</Badge>
                    ) : introStrategySource ? (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        Regeln
                      </Badge>
                    ) : null}
                  </div>
                  {introStrategyLoading ? (
                    <p className="mt-1 text-xs text-slate-600">Empfehlung wird geladen …</p>
                  ) : introStrategyText ? (
                    <p className="mt-1 text-sm leading-snug text-slate-800 dark:text-slate-100">{introStrategyText}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Keine Empfehlung verfügbar.</p>
                  )}
                </div>
                <div className="mb-2 flex flex-wrap items-center justify-end gap-1.5">
                  {([
                    ['challenging', 'Herausfordernd'],
                    ['advisory', 'Beratend'],
                    ['concise', 'Kurz & Knapp'],
                  ] as const).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={introTone === value ? 'secondary' : 'ghost'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setIntroTone(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
                    <Link
                      href={
                        selected.kind === 'exec'
                          ? selected.sourceHref
                          : `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
                              selected.companyName
                            )}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <AppIcon icon={Linkedin01Icon} size={16} />
                      Auf LinkedIn öffnen
                    </Link>
                  </Button>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                          aria-label="Gemeinsame Kontakte"
                        >
                          <span className="inline-flex items-center -space-x-1.5" aria-hidden>
                            <AppIcon icon={UserMultipleIcon} size={14} />
                            <AppIcon icon={UserMultipleIcon} size={14} className="opacity-80" />
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <p className="mb-1.5 font-semibold">Gemeinsame Kontakte</p>
                        {mutualConnectionsPreview.bridges.length ? (
                          <ul className="list-inside list-disc space-y-1 leading-snug">
                            {mutualConnectionsPreview.bridges.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="leading-snug text-slate-600 dark:text-slate-400">
                            Noch keine gematchten Pfade. Mit LinkedIn-Integration werden hier Warm-Intro-Ideen sichtbar.
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-2">
                        <AppIcon icon={UploadIcon} size={16} />
                        Zu Deal hinzufügen
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {model.activeDeals.length === 0 ? (
                        <DropdownMenuItem disabled>Keine aktiven Deals</DropdownMenuItem>
                      ) : (
                        model.activeDeals.slice(0, 12).map((d) => (
                          <DropdownMenuItem
                            key={d.id}
                            disabled={addToDealPendingId === d.id}
                            onSelect={async () => {
                              if (!selected) return
                              setAddToDealPendingId(d.id)
                              const signalKey = `${selected.kind === 'exec' ? 'market_exec' : 'market_news'}:${selected.id}`
                              const res = await addMarketSignalToDeal({
                                dealId: d.id,
                                companyId: selected.companyId,
                                signalKey,
                                referenceIds: (quickRefs ?? []).map((r) => r.id),
                              })
                              setAddToDealPendingId(null)
                              if (!res.success) {
                                toast.error(res.error)
                                return
                              }
                              toast.success(
                                res.added > 0
                                  ? `Zu Deal hinzugefügt: ${res.added} Referenz${res.added === 1 ? '' : 'en'}`
                                  : 'Zum Deal hinzugefügt',
                                {
                                  action: {
                                    label: 'Deal öffnen',
                                    onClick: () => {
                                      window.location.href = ROUTES.deals.detail(d.id)
                                    },
                                  },
                                }
                              )
                              await dismissItems(clusterItemsForDismiss)
                              setSelectedKey(null)
                            }}
                          >
                            {d.title}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      toast.success(
                        attachedRefIds.size > 0
                          ? `Intro-Draft wird generiert (${attachedRefIds.size} Referenz${attachedRefIds.size === 1 ? '' : 'en'} angehängt, Ton: ${
                              introTone === 'challenging'
                                ? 'Herausfordernd'
                                : introTone === 'concise'
                                  ? 'Kurz & Knapp'
                                  : 'Beratend'
                            }).`
                          : `Intro-Draft wird generiert (Ton: ${
                              introTone === 'challenging'
                                ? 'Herausfordernd'
                                : introTone === 'concise'
                                  ? 'Kurz & Knapp'
                                  : 'Beratend'
                            }).`
                      )
                    }
                  >
                    <AppIcon icon={Sparkles} size={16} />
                    Intro-Draft generieren
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
