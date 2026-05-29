'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Calendar,
  CheckmarkCircle02Icon,
  CopyCheckIcon,
  CopyIcon,
  Delete02Icon,
  ExternalLink,
  FilterHorizontalIcon,
  InformationCircleIcon,
  Linkedin01Icon,
  LinkIcon,
  Loader,
  Message01Icon,
  Paperclip,
  PinIcon,
  RefreshCw,
  SettingsIcon,
  Sparkles,
  SquareLock02Icon,
  StarIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Timer,
  UploadIcon,
  Users,
} from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import {
  buildMarketSignalIntelligence,
  formatRoleChangeFact,
  parseWarmIntroBridge,
} from '@/lib/market-signals/signal-intelligence'
import { CheckIcon } from '@/components/ui/check-icon'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/lib/routes'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  addMarketSignalToDeal,
  getDecisionMakerCandidates,
  logMarketSignalQuickAction,
  markMarketSignalNotificationsRead,
  markMarketSignalsIrrelevant,
  requestReferenceApprovalForSignal,
  setMarketSignalPriority,
  snoozeMarketSignal,
  submitMarketSignalDraftFeedback,
  triggerMarketSignalsIngestForMyOrg,
} from '@/app/dashboard/market-signals/actions'
import type { DecisionMakerCandidate } from '@/app/dashboard/market-signals/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useRole } from '@/hooks/useRole'
/** Einheitlicher Toolbar-/Aktions-Icon-Stil (wie Referenzen-Übersicht). */
const MS_TOOLBAR_ICON_CLASS = 'shrink-0 text-muted-foreground'

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

function personInitials(name: string): string {
  const parts = String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
  const { isAdmin, isAccountManager, isSales } = useRole()
  const router = useRouter()
  const [newsIngestPending, startNewsIngest] = useTransition()

  useEffect(() => {
    const REFRESH_MS = 120_000
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      router.refresh()
    }
    const id = window.setInterval(tick, REFRESH_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [router])
  const canRunNewsIngest = isAdmin || isAccountManager || isSales
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
        personTitleBefore?: string | null
        personTitleAfter?: string | null
        changeSummaryRaw?: string
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

  function signalKeyOf(item: InboxItem): string {
    return `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
  }

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
    if (badge === 'people') return { short: 'Executive Update', full: 'Executive Update' }
    return { short: 'Company News', full: 'Company News' }
  }

  /** Linker Akzentbalken für die ausgewählte Inbox-Zeile (Kategorie-Farbe). */
  function inboxRowAccentClass(item: InboxItem): string {
    if (item.kind === 'exec' || item.categoryBadge === 'people') return 'border-l-blue-600'
    if (item.categoryBadge === 'finance') return 'border-l-emerald-500'
    return 'border-l-amber-400'
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

  /** Kompakte Inbox-Zeile: Signal-Art. */
  function inboxRowSignalTypeLabel(item: InboxItem): string {
    if (item.kind === 'exec') return 'Executive Update'
    return 'Company News'
  }

  const restrictedSet = useMemo(
    () => (restrictedCompanyIds?.length ? new Set(restrictedCompanyIds) : null),
    [restrictedCompanyIds]
  )

  const [readKeys, setReadKeys] = useState(() => new Set(model.signalReadKeys))
  const [priorityKeys, setPriorityKeys] = useState(() => {
    const s = new Set<string>()
    for (const k of model.signalReadKeys) {
      if (k.startsWith('market_priority:today:')) s.add(k.replace('market_priority:today:', ''))
    }
    return s
  })
  const [snoozedUntilByKey, setSnoozedUntilByKey] = useState(() => {
    const m = new Map<string, number>()
    for (const k of model.signalReadKeys) {
      if (!k.startsWith('market_snooze_until:')) continue
      const parts = k.split(':')
      if (parts.length < 4) continue
      const until = new Date(parts[2]).getTime()
      const signalKey = parts.slice(3).join(':')
      if (Number.isFinite(until)) m.set(signalKey, until)
    }
    return m
  })
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
  const [signalFilter, setSignalFilter] = useState('')

  const items: InboxItem[] = useMemo(() => {
    const execItems: InboxItem[] = model.executives.map((row) => {
      const linkedInHref = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
        `${row.personName} ${row.companyName}`
      )}`
      const pressUrl = String(row.sourceUrl ?? '').trim()
      const isPress = row.eventKind === 'news_mention'
      const href =
        isPress && pressUrl && /^https?:\/\//i.test(pressUrl) ? pressUrl : linkedInHref
      const headline = `${row.personName} · ${row.companyName}`
      const roleFact = formatRoleChangeFact({
        personName: row.personName,
        personTitleBefore: row.personTitleBefore,
        personTitleAfter: row.personTitleAfter,
        companyName: row.companyName,
        changeSummary: row.changeSummary,
      })
      return {
        kind: 'exec',
        id: row.id,
        companyId: row.companyId,
        companyName: row.companyName,
        companyLogoUrl: row.companyLogoUrl,
        headline,
        detectedAt: row.detectedAt,
        sourceLabel: isPress ? 'Presse' : 'LinkedIn',
        sourceHref: href,
        sourceSummary: summarizeSourceText(roleFact),
        listTitlePrefix: row.personName || 'Person',
        listTitleRest: isPress ? `${row.companyName} · Executive in den Medien` : `${row.companyName} · Executive Tracking`,
        categoryBadge: 'people',
        personName: row.personName,
        personTitleBefore: row.personTitleBefore,
        personTitleAfter: row.personTitleAfter,
        changeSummaryRaw: row.changeSummary,
      }
    })
    const newsItems: InboxItem[] = model.news.map((row) => {
      const source = String(row.sourceLabel ?? '').trim()
      const directUrl = String(row.sourceUrl ?? '').trim()
      const href =
        directUrl && /^https?:\/\//i.test(directUrl)
          ? directUrl
          : /^https?:\/\//i.test(source)
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
      .filter((x) => {
        const signalKey = signalKeyOf(x)
        const until = snoozedUntilByKey.get(signalKey)
        return !(until && until > Date.now())
      })
      .sort((a, b) => {
        const aPriority = priorityKeys.has(signalKeyOf(a)) ? 1 : 0
        const bPriority = priorityKeys.has(signalKeyOf(b)) ? 1 : 0
        if (aPriority !== bPriority) return bPriority - aPriority
        const aT = new Date(a.kind === 'exec' ? a.detectedAt : a.publishedOn).getTime()
        const bT = new Date(b.kind === 'exec' ? b.detectedAt : b.publishedOn).getTime()
        return bT - aT
      })
    return merged
  }, [
    buildCompanyNewsHeadline,
    irrelevantKeys,
    model.executives,
    model.followingCompanyIds,
    model.news,
    onlyFocusAccounts,
    priorityKeys,
    restrictedSet,
    signalKeyOf,
    snoozedUntilByKey,
  ])

  const visibleItems = useMemo(() => {
    const categoryFiltered =
      inboxCategory === 'people'
        ? items.filter((item) => item.kind === 'exec')
        : inboxCategory === 'company'
          ? items.filter((item) => item.kind === 'news')
          : items
    const q = signalFilter.trim().toLowerCase()
    if (!q) return categoryFiltered
    return categoryFiltered.filter((item) =>
      [item.headline, item.companyName, item.listTitleRest, item.sourceSummary]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [inboxCategory, items, signalFilter])

  const groupedVisibleItems = useMemo(
    () =>
      visibleItems.map((item) => {
        const ts = item.kind === 'exec' ? item.detectedAt : item.publishedOn
        const company: GroupCompany = {
          id: item.companyId,
          name: item.companyName,
          logoUrl: item.companyLogoUrl,
        }
        return {
          key: signalKeyOf(item),
          representative: item,
          items: [item],
          personNames: item.personName ? [item.personName] : [],
          companies: [company],
          sourceLabels: [item.sourceLabel],
          latestTs: ts,
        } satisfies InboxGroup
      }),
    [visibleItems]
  )

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
  const [introDraftRequested, setIntroDraftRequested] = useState(false)
  const [introDraftRunId, setIntroDraftRunId] = useState(0)
  const [onlyApprovedReferences, setOnlyApprovedReferences] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [signalEvidenceExpanded, setSignalEvidenceExpanded] = useState(false)

  useEffect(() => {
    setSignalEvidenceExpanded(false)
  }, [selectedKey])

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
    setIntroDraftRequested(false)
    setIntroStrategyText(null)
    setIntroStrategySource(null)
  }, [selected?.id, selectedGroup?.key])

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

  async function toggleTodayPriority(item: InboxItem) {
    const key = signalKeyOf(item)
    const has = priorityKeys.has(key)
    const res = await setMarketSignalPriority({ signalKey: key, priority: has ? 'none' : 'today' })
    if (!res.success) return toast.error(res.error)
    setPriorityKeys((prev) => {
      const next = new Set(prev)
      if (has) next.delete(key)
      else next.add(key)
      return next
    })
    toast.success(has ? 'Priorität entfernt' : 'Heute zuerst markiert')
  }

  async function snoozeSelected(days: number) {
    if (!selected) return
    const key = signalKeyOf(selected)
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const res = await snoozeMarketSignal({ signalKey: key, untilIso: until })
    if (!res.success) return toast.error(res.error)
    setSnoozedUntilByKey((prev) => new Map(prev).set(key, new Date(until).getTime()))
    toast.success(days === 1 ? 'Auf morgen verschoben' : 'Auf nächste Woche verschoben')
  }

  async function submitDraftFeedback(helpful: boolean) {
    if (!selected) return
    const reason = helpful ? '' : window.prompt('Warum war der Draft nicht hilfreich? (optional)') ?? ''
    const res = await submitMarketSignalDraftFeedback({
      signalKey: signalKeyOf(selected),
      helpful,
      reason,
    })
    if (!res.success) return toast.error(res.error)
    toast.success('Danke – Feedback wurde protokolliert (internes Audit-Log).')
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
      companyId: string
      companyName: string
      companyLogoUrl: string | null
    }> = []
    for (const it of selectedGroup.items) {
      const snips = model.referenceSnippetsByCompanyId[it.companyId] ?? []
      for (const r of snips) {
        if (seen.has(r.id)) continue
        seen.add(r.id)
        out.push(r)
        if (out.length >= 6) return out
      }
    }
    return out
  }, [model.referenceSnippetsByCompanyId, selectedGroup])
  const sortedQuickRefs = useMemo(
    () =>
      [...quickRefs].sort((a, b) => {
        const aApproved = String(a.status ?? '').toLowerCase() === 'approved' ? 0 : 1
        const bApproved = String(b.status ?? '').toLowerCase() === 'approved' ? 0 : 1
        if (aApproved !== bApproved) return aApproved - bApproved
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    [quickRefs]
  )
  const visibleQuickRefs = useMemo(
    () =>
      sortedQuickRefs.filter((r) =>
        onlyApprovedReferences ? String(r.status ?? '').toLowerCase() === 'approved' : true
      ),
    [onlyApprovedReferences, sortedQuickRefs]
  )

  useEffect(() => {
    setAttachedRefIds((prev) => {
      // Verhindert Render-Loops: Wenn sich der Inhalt nicht ändert, dieselbe Set-Instanz zurückgeben.
      if (!selected || quickRefs.length === 0) {
        return prev.size === 0 ? prev : new Set()
      }

      const allowed = new Set(quickRefs.map((r) => r.id))

      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (allowed.has(id)) next.add(id)
        else changed = true
      }

      return changed ? next : prev
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

  function buildIntroSnippet(item: InboxItem, intelligence: ReturnType<typeof buildMarketSignalIntelligence> | null) {
    if (intelligence) {
      return `${intelligence.insight.signal_fact} ${intelligence.insight.why_now}`
    }
    return item.sourceSummary
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
        legalBadgeLabel: 'Freigabe eingeschränkt',
        legalBadgeClassName:
          'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
        dotClass: 'bg-amber-400',
        detailHint: 'Kein Firmenname/Logo nach außen – nur anonyme Formulierungen.',
      }
    }
    return {
      legalBadgeLabel: 'Freigabe ausstehend',
      legalBadgeClassName:
        'border-border bg-muted text-foreground/85 dark:border-border dark:bg-muted/50 dark:text-foreground',
      dotClass: 'bg-muted-foreground',
      detailHint: 'Intern nutzbar – vor externem Einsatz Freigabe anfragen.',
    }
  }

  function referenceMatchReason(reference: { title: string; industry: string | null }) {
    if (selected?.categoryBadge === 'people') {
      return `Match-Grund: Executive-Wechsel und Stakeholder-Kontext passen zum Case "${reference.title}".`
    }
    if (selected?.categoryBadge === 'finance') {
      return `Match-Grund: Ähnlicher Anwendungsfall in finanziell getriebener Transformation (${reference.industry ?? 'Branche'}).`
    }
    return `Match-Grund: Ähnlicher Anwendungsfall: Compliance-/Strategie-Umsetzung in ${reference.industry ?? 'vergleichbarem Kontext'}.`
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

  /** Max. drei Top-Kontakte — horizontal statt vertikal gestapelt. */
  const displayStakeholders = useMemo(() => decisionCandidates.slice(0, 3), [decisionCandidates])

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

  const signalIntelligence = useMemo(() => {
    if (!selected) return null
    const primary = decisionCandidates[0]
    const bridgeLine = primary?.mutualConnectionBridges?.[0]
    const bridge = bridgeLine ? parseWarmIntroBridge(bridgeLine) : null
    return buildMarketSignalIntelligence({
      signalKind: selected.kind,
      personName: selected.kind === 'exec' ? selected.personName : undefined,
      companyName: selected.companyName,
      personTitleBefore: selected.kind === 'exec' ? selected.personTitleBefore : undefined,
      personTitleAfter: selected.kind === 'exec' ? selected.personTitleAfter : undefined,
      changeSummary: selected.kind === 'exec' ? selected.changeSummaryRaw : undefined,
      newsBody: selected.kind === 'news' ? selected.body : undefined,
      references: quickRefs.map((r) => ({ id: r.id, title: r.title, status: r.status })),
      onlyApprovedReferences,
      primaryStakeholder: primary
        ? { fullName: primary.fullName, title: primary.title }
        : null,
      warmIntro: bridge
        ? { colleagueName: bridge.colleague, stakeholderName: bridge.stakeholder }
        : null,
    })
  }, [decisionCandidates, onlyApprovedReferences, quickRefs, selected])

  const executiveSummaryBullets = useMemo(
    () => signalIntelligence?.bullets ?? [],
    [signalIntelligence]
  )

  const signalEvidenceText = useMemo(() => {
    if (!selected) return ''
    if (selected.kind === 'news') return String(selected.body || selected.sourceSummary || '').trim()
    return (
      signalIntelligence?.insight.signal_fact ||
      (selected.kind === 'exec' ? selected.changeSummaryRaw : '') ||
      String(selected.sourceSummary || '')
    ).trim()
  }, [selected, signalIntelligence])
  const isSelectedInPipeline = useMemo(() => {
    if (!selected) return false
    const ids = selectedGroup?.companies?.length
      ? selectedGroup.companies.map((c) => c.id)
      : [selected.companyId]
    return ids.some((id) => model.activeDealCompanyIds.includes(id))
  }, [model.activeDealCompanyIds, selected, selectedGroup])

  function renderDraftText(text: string | null): ReactNode {
    const content = String(text ?? '').trim()
    if (!content) return <p className="text-sm leading-relaxed text-muted-foreground">Keine Empfehlung verfügbar.</p>
    const paragraphs = content.split(/\n+/).filter(Boolean)
    return (
      <div className="space-y-3 font-serif text-[15px] leading-relaxed text-foreground">
        {paragraphs.map((para, pi) => {
          const parts = para.split(/(\[[^\]]+\])/g)
          return (
            <p key={pi}>
              {parts.map((part, idx) =>
                /^\[[^\]]+\]$/.test(part) ? (
                  <span
                    key={idx}
                    className="rounded px-1 font-sans text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-100"
                  >
                    {part}
                  </span>
                ) : (
                  <span key={idx}>{part}</span>
                )
              )}
            </p>
          )
        })}
      </div>
    )
  }

  function explainIngestError(message: string) {
    const raw = String(message ?? '')
    if (/SUPABASE_SERVICE_ROLE_KEY/i.test(raw)) {
      return raw
    }
    return raw || 'Synchronisierung konnte nicht gestartet werden.'
  }

  async function copyStrategySnippet() {
    if (!selected) return
    const text = introStrategyText?.trim() || buildIntroSnippet(selected, signalIntelligence)
    await navigator.clipboard.writeText(text)
    setCopySuccess(true)
    window.setTimeout(() => setCopySuccess(false), 1200)
    toast.success('Entwurf kopiert')
  }

  function triggerIntroDraftGeneration() {
    setIntroDraftRequested(true)
    setIntroDraftRunId((prev) => prev + 1)
  }

  async function handleWarmIntroRequest(colleagueName: string, stakeholderName: string) {
    if (!selected) return
    const key = signalKeyOf(selected)
    await logMarketSignalQuickAction({ signalKey: key, channel: 'slack_mention' })
    toast.success(`Warm-Intro über ${colleagueName} an ${stakeholderName} – Team in Slack informieren.`)
    window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!selected) {
      setIntroStrategyText(null)
      setIntroStrategySource(null)
      setIntroStrategyLoading(false)
      setIntroDraftRequested(false)
      return
    }
    if (!introDraftRequested) {
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
            summarySnippet: (signalIntelligence?.insight.why_now ?? selected.sourceSummary).slice(0, 1200),
            referenceTitles: visibleQuickRefs.map((r) => r.title),
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
  }, [selected, introTone, visibleQuickRefs, signalIntelligence, introDraftRequested, introDraftRunId])

  function runManualNewsIngest() {
    startNewsIngest(async () => {
      const result = await triggerMarketSignalsIngestForMyOrg()
      if (!result.success) {
        toast.error(explainIngestError(result.error))
        return
      }
      const ne = result.news.errors.length
      const ee = result.executives.errors.length
      if (ne > 0) console.warn('[market-signals ingest / news]', result.news.errors)
      if (ee > 0) console.warn('[market-signals ingest / executives]', result.executives.errors)
      toast.success(
        `Signale: ${result.news.articlesInserted} News · ${result.executives.signalsInserted} Executive` +
          (result.executives.skippedNoCompany > 0
            ? ` (${result.executives.skippedNoCompany} Exec. ohne Account-Zuordnung übersprungen)`
            : '')
      )
      router.refresh()
    })
  }

  const outreachDraftTargetName =
    decisionCandidates[0]?.fullName?.split(/\s+/)[0] ?? 'Kontakt'

  const INTRO_TONE_OPTIONS = [
    ['challenging', 'Herausfordernd'],
    ['advisory', 'Beratend'],
    ['concise', 'Kurz & Knapp'],
  ] as const

  function renderIntroTonePicker() {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">Tonalität des Entwurfs</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tonalität des Outreach-Entwurfs">
          {INTRO_TONE_OPTIONS.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={introTone === value ? 'secondary' : 'outline'}
              className="h-8 px-3 text-xs"
              aria-pressed={introTone === value}
              onClick={() => setIntroTone(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  function renderOutreachDraftComposer() {
    return (
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Platzhalter wie{' '}
          <span className="rounded bg-yellow-100 px-1 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-100">
            [Name]
          </span>{' '}
          markieren offene Personalisierung im generierten Text.
        </p>
        <div className="mt-4">{renderIntroTonePicker()}</div>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="mt-4 w-full gap-2 shadow-sm"
          onClick={triggerIntroDraftGeneration}
        >
          <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
          Outreach-Draft für {outreachDraftTargetName} generieren
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-x-hidden">
      <div className="h-[calc(100vh-140px)] min-h-[540px] max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={22} className="min-w-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30">
              <div className="flex h-12 items-center justify-between bg-card px-2 pb-1">
                <p className="text-sm font-semibold text-foreground">Inbox</p>
                <div className="flex items-center gap-0.5">
                  <p className="mr-1 text-xs tabular-nums text-muted-foreground">{groupedVisibleItems.length} Signale</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        aria-label="Watchlist und Executives verwalten"
                        title="Watchlist und Executives verwalten"
                      >
                        <AppIcon icon={SettingsIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Marktsignale verwalten
                      </DropdownMenuLabel>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`${ROUTES.marketSignalsManage}?view=champions`} className="flex items-center gap-2">
                          <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                          Executives verwalten
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={ROUTES.marketSignalsManage} className="flex items-center gap-2">
                          <AppIcon icon={StarIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                          Watchlist verwalten
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground/85"
                    onClick={() => void dismissAllVisible()}
                    disabled={groupedVisibleItems.length === 0}
                    aria-label="Alle sichtbaren Signale archivieren"
                    title="Alle sichtbaren Signale archivieren"
                  >
                    <AppIcon icon={Delete02Icon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                  </Button>
                </div>
              </div>
              <div className="border-b border-border bg-card px-2 py-1.5">
                <div className="inline-flex w-full items-center rounded-lg border border-border bg-muted/50 p-1">
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
                    Account
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="toolbar"
                          className={cn('shrink-0 px-2.5 hover:bg-muted/70', onlyActiveDeals && 'bg-muted')}
                          aria-pressed={onlyActiveDeals}
                          aria-label="Nur aktive Deals"
                          onClick={() => setOnlyActiveDeals((prev) => !prev)}
                        >
                          <AppIcon icon={FilterHorizontalIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        Nur Accounts mit aktivem Deal in der Inbox
                        {onlyActiveDeals ? ' (ein)' : ' (aus)'}.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="toolbar"
                          className={cn('shrink-0 px-2.5 hover:bg-muted/70', onlyFocusAccounts && 'bg-muted')}
                          aria-pressed={onlyFocusAccounts}
                          aria-label="Nur Focus-Accounts"
                          onClick={() => setOnlyFocusAccounts((prev) => !prev)}
                        >
                          <AppIcon icon={StarIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        Nur Accounts aus deiner Watchlist (Focus)
                        {onlyFocusAccounts ? ' (ein)' : ' (alle Accounts)'}.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    value={signalFilter}
                    onChange={(e) => setSignalFilter(e.target.value)}
                    placeholder="Signale filtern..."
                    className="h-8 min-w-0 flex-1 bg-card text-xs"
                    aria-label="Signale filtern"
                  />
                  {canRunNewsIngest ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="toolbar"
                            className="shrink-0 px-2.5 hover:bg-muted/70"
                            disabled={newsIngestPending}
                            aria-label="Neue Signale aus Feeds laden"
                            onClick={() => runManualNewsIngest()}
                          >
                            {newsIngestPending ? (
                              <AppIcon icon={Loader} size={16} className="animate-spin text-muted-foreground" />
                            ) : (
                              <AppIcon icon={RefreshCw} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-snug">
                          <span className="font-medium text-foreground">Feeds jetzt abrufen</span>
                          <span className="mt-1 block text-muted-foreground">
                            Lädt neue Company-News und Executive-Signale (RSS). Die Liste aktualisiert sich zusätzlich
                            etwa alle 2 Minuten automatisch vom Server.
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2 [scrollbar-gutter:stable] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar]:w-2">
                {groupedVisibleItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
                      <p className="mt-1 text-xs text-muted-foreground">Keine neuen Signale in deiner Watchlist.</p>
                    </div>
                  </div>
                ) : (
                  <TooltipProvider delayDuration={250}>
                  <div className="space-y-3">
                    {(['Heute', 'Gestern', 'Ältere'] as const).map((label) =>
                      (grouped[label] ?? []).length ? (
                        <div key={label} className="space-y-2">
                          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                              const listAria = `${rep.companyName}. ${inboxRowSignalTypeLabel(rep)}. ${rep.headline}`
                              const isTodayPriority = priorityKeys.has(signalKeyOf(rep))
                              return (
                                <li key={key}>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label={listAria}
                                    title={`${relativeTime(ts)} · ${rep.headline}`}
                                    onClick={() => {
                                      setSelectedKey(key)
                                      if (isMobile) setMobileOpen(true)
                                      void markReadForGroup(groupItem.items)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key !== 'Enter' && e.key !== ' ') return
                                      e.preventDefault()
                                      setSelectedKey(key)
                                      if (isMobile) setMobileOpen(true)
                                      void markReadForGroup(groupItem.items)
                                    }}
                                    className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-l-[3px] py-2 pl-2 pr-1 text-left transition-colors ${
                                      isActive
                                        ? `bg-primary/10 ${inboxRowAccentClass(rep)} dark:bg-primary/15`
                                        : `border-l-transparent hover:bg-muted/70`
                                    }`}
                                  >
                                    <div className="relative flex shrink-0 -space-x-1.5">
                                      {groupItem.companies.length > 1
                                        ? groupItem.companies.slice(0, 3).map((co) => (
                                            <div
                                              key={co.id}
                                              className="relative z-10 size-8 overflow-hidden rounded-md border border-background bg-card ring-1 ring-border/80"
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
                                          ))
                                        : rep.companyLogoUrl ? (
                                            <div className="relative size-8 overflow-hidden rounded-md border border-border bg-card ring-1 ring-border/80">
                                              <Image
                                                src={rep.companyLogoUrl}
                                                alt=""
                                                fill
                                                sizes="32px"
                                                className="object-contain p-1"
                                              />
                                            </div>
                                          ) : (
                                            <div className="size-8 rounded-md bg-muted ring-1 ring-border/80" />
                                          )}
                                      {groupItem.companies.length > 3 ? (
                                        <span className="z-20 inline-flex size-8 items-center justify-center rounded-md border border-border bg-muted text-[9px] font-semibold text-muted-foreground">
                                          +{groupItem.companies.length - 3}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-1 text-xs font-semibold text-foreground">
                                        {groupItem.companies.length > 1
                                          ? `${groupItem.companies.length} Accounts`
                                          : rep.companyName}
                                      </p>
                                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                        {inboxRowSignalTypeLabel(rep)}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 pr-0.5">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span
                                            className={`size-2.5 shrink-0 rounded-full ${
                                              isTodayPriority ? 'bg-amber-500' : 'bg-muted-foreground/40'
                                            }`}
                                            aria-label={isTodayPriority ? 'Priorität: Heute zuerst' : 'Standard-Priorität'}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[200px] text-xs">
                                          {isTodayPriority
                                            ? 'Heute zuerst markiert.'
                                            : 'Standard-Priorität. Über „Aktionen“ als Heute zuerst markieren.'}
                                        </TooltipContent>
                                      </Tooltip>
                                      {!allRead ? (
                                        <span
                                          className="size-2 shrink-0 rounded-full bg-blue-500"
                                          title="Ungelesen"
                                          aria-hidden
                                        />
                                      ) : null}
                                    </div>
                                    <div className="relative shrink-0">
                                      <div className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-border/60 bg-background/95 px-0.5 py-0.5 opacity-0 shadow-sm ring-1 ring-border/60 backdrop-blur-sm transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 dark:bg-popover/95">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                              aria-label="Aus Inbox ausblenden"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                void dismissItems(groupItem.items)
                                              }}
                                            >
                                              <CheckIcon className="size-4" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="max-w-[220px] text-xs">
                                            Aus Inbox ausblenden (erledigt / nicht mehr anzeigen).
                                          </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                              aria-label="KI-Intro-Snippet kopieren"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                void navigator.clipboard.writeText(buildIntroSnippet(rep, null))
                                                toast.success('AI-Intro-Snippet kopiert.')
                                              }}
                                            >
                                              <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="max-w-[220px] text-xs">
                                            KI-Intro-Snippet in die Zwischenablage kopieren.
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={70} minSize={45} className="hidden lg:block">
            <div className="relative h-full overflow-hidden bg-background">
              <div className="h-full">
                {!selected ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      {groupedVisibleItems.length === 0 ? (
                        <>
                          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CheckIcon className="size-5" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-foreground">Inbox Zero erreicht</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Stark! Keine offenen Signale mehr. Hier sind die Top Trending Accounts als nächster Fokus.
                          </p>
                          <div className="mt-4 space-y-2 text-left">
                            {trendingAccounts.length === 0 ? (
                              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                Aktuell keine Trending Accounts verfügbar.
                              </div>
                            ) : (
                              trendingAccounts.map((account) => (
                                <Link
                                  key={account.companyId}
                                  href={ROUTES.accountsDetail(account.companyId)}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-foreground/85 hover:bg-muted"
                                >
                                  <span className="truncate font-medium text-foreground">{account.companyName}</span>
                                  <span className="shrink-0 text-muted-foreground">{account.count} Signale</span>
                                </Link>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-foreground/85">
                            <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-foreground">Kein Signal ausgewählt</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Wähle ein Signal aus, um Details und passende Referenzen zu sehen.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="shrink-0 border-b border-border px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="relative mt-0.5 flex shrink-0 -space-x-2">
                            {selectedGroup && selectedGroup.companies.length > 1
                              ? selectedGroup.companies.slice(0, 4).map((co) => (
                                  <div
                                    key={co.id}
                                    className="relative z-10 size-10 overflow-hidden rounded-xl border-2 border-background bg-card shadow-sm ring-1 ring-border"
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
                                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                                    <Image
                                      src={selected.companyLogoUrl}
                                      alt=""
                                      fill
                                      sizes="40px"
                                      className="object-contain p-1.5"
                                    />
                                  </div>
                                ) : (
                                  <div className="size-10 shrink-0 rounded-xl border border-border bg-card" />
                                )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="min-w-0 truncate text-lg font-semibold leading-none tracking-tight text-foreground md:text-xl">
                              {selected.headline}
                            </p>
                            <div className="mt-1.5 flex min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden text-xs text-muted-foreground">
                              <span className="shrink-0">
                                {selectedGroup && selectedGroup.companies.length > 1
                                  ? `${selectedGroup.companies.length} Accounts`
                                  : selected.companyName}
                              </span>
                              <span className="shrink-0" aria-hidden>
                                •
                              </span>
                              <span
                                className="shrink-0 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/85"
                                title={signalTypeLabel(selected.categoryBadge).full}
                              >
                                {signalTypeLabel(selected.categoryBadge).short}
                              </span>
                              <span className="shrink-0" aria-hidden>
                                •
                              </span>
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={selected.sourceHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-w-0 max-w-full items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline dark:text-blue-400"
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
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => void submitDraftFeedback(true)}
                            aria-label="Nützlich"
                          >
                            <AppIcon icon={ThumbsUpIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => void submitDraftFeedback(false)}
                            aria-label="Nicht nützlich"
                          >
                            <AppIcon icon={ThumbsDownIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8"
                                title="Wiedervorlage, Priorität und Slack"
                                aria-label="Wiedervorlage, Priorität und Slack"
                              >
                                <AppIcon icon={Calendar} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[14rem]">
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Inbox &amp; Erinnerung
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer flex-col items-start gap-0.5 py-2"
                                onSelect={() => void toggleTodayPriority(selected)}
                              >
                                <span className="flex w-full items-center gap-2 text-sm font-medium">
                                  <AppIcon icon={PinIcon} size={16} className="shrink-0 text-amber-600" aria-hidden />
                                  Heute zuerst
                                </span>
                                <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                                  Signal oben in der Liste priorisieren (oder Priorität wieder entfernen).
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer flex-col items-start gap-0.5 py-2"
                                onSelect={() => void snoozeSelected(1)}
                              >
                                <span className="flex w-full items-center gap-2 text-sm font-medium">
                                  <AppIcon icon={Timer} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                                  Morgen
                                </span>
                                <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                                  Signal vorübergehend ausblenden und morgen wieder anzeigen.
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer flex-col items-start gap-0.5 py-2"
                                onSelect={() => void snoozeSelected(7)}
                              >
                                <span className="flex w-full items-center gap-2 text-sm font-medium">
                                  <AppIcon icon={Calendar} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                                  Nächste Woche
                                </span>
                                <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                                  Eine Woche zurückstellen – weniger Lärm, später wieder dran.
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Team
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer flex-col items-start gap-0.5 py-2"
                                onSelect={async () => {
                                  const key = signalKeyOf(selected)
                                  await logMarketSignalQuickAction({ signalKey: key, channel: 'slack_mention' })
                                  window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer')
                                }}
                              >
                                <span className="flex w-full items-center gap-2 text-sm font-medium">
                                  <AppIcon icon={Message01Icon} size={16} className="shrink-0 text-violet-600" aria-hidden />
                                  Slack öffnen
                                </span>
                                <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                                  Schnellweg in Slack – z. B. Account Executive oder Team pingen (kein Auto-Post).
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {selected.kind === 'exec' ? (
                            <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" asChild>
                              <Link href={selected.sourceHref} target="_blank" rel="noreferrer" aria-label="Auf LinkedIn öffnen">
                                <AppIcon icon={Linkedin01Icon} size={16} />
                              </Link>
                            </Button>
                          ) : null}
                          <HoverCard openDelay={200} closeDelay={150}>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                  mutualConnectionsPreview.count > 0
                                    ? 'border-violet-200 bg-violet-50/90 text-violet-900 shadow-sm hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-950/70'
                                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                                }`}
                                title={
                                  mutualConnectionsPreview.count > 0
                                    ? `${mutualConnectionsPreview.count} ${
                                        mutualConnectionsPreview.count === 1 ? 'gemeinsamer Kontakt' : 'gemeinsame Kontakte'
                                      }`
                                    : 'Gemeinsame Kontakte'
                                }
                                aria-label={
                                  mutualConnectionsPreview.count > 0
                                    ? `${mutualConnectionsPreview.count} ${
                                        mutualConnectionsPreview.count === 1 ? 'gemeinsamer Kontakt' : 'gemeinsame Kontakte'
                                      }, Details anzeigen`
                                    : 'Gemeinsame Kontakte und Warm-Intro-Pfade'
                                }
                              >
                                <AppIcon icon={Users} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent
                              side="top"
                              align="end"
                              className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden border-border p-0 shadow-lg dark:border-border"
                            >
                              <div className="border-b border-border bg-muted/55 px-3 py-2.5 dark:border-border dark:bg-muted/40">
                                <p className="text-sm font-semibold text-foreground">Gemeinsame Kontakte</p>
                                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                  Kolleg:innen mit direkter Verbindung zum Ansprechpartner – guter Hebel für ein Warm-Intro.
                                </p>
                              </div>
                              <div className="max-h-[min(18rem,55vh)] space-y-2 overflow-y-auto p-2">
                                {mutualConnectionsPreview.bridges.length ? (
                                  mutualConnectionsPreview.bridges.map((line, i) => {
                                    const parsed = parseWarmIntroBridge(line)
                                    if (!parsed) {
                                      return (
                                        <div
                                          key={i}
                                          className="rounded-lg border border-border/80 bg-card px-3 py-2 text-xs leading-snug text-foreground/85 dark:border-border dark:bg-card/80 dark:text-foreground/90"
                                        >
                                          {line}
                                        </div>
                                      )
                                    }
                                    return (
                                      <div
                                        key={i}
                                        className="flex gap-2.5 rounded-lg border border-border/80 bg-card p-2.5 shadow-sm dark:border-border dark:bg-card/80"
                                      >
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <span
                                            className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-200"
                                            title={parsed.colleague}
                                          >
                                            {personInitials(parsed.colleague)}
                                          </span>
                                          <span className="text-[10px] font-medium text-muted-foreground" aria-hidden>
                                            ↔
                                          </span>
                                          <span
                                            className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200"
                                            title={parsed.stakeholder}
                                          >
                                            {personInitials(parsed.stakeholder)}
                                          </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium text-foreground">
                                            <span className="text-blue-700 dark:text-blue-300">{parsed.colleague}</span>
                                            <span className="font-normal text-muted-foreground"> kennt </span>
                                            <span className="text-emerald-800 dark:text-emerald-200">{parsed.stakeholder}</span>
                                          </p>
                                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                            Starkes Warm-Intro: gemeinsame Verbindung nutzen.
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })
                                ) : (
                                  <p className="px-1 py-2 text-xs leading-snug text-muted-foreground">
                                    Noch keine gematchten Pfade. Mit LinkedIn/Sales Navigator erscheinen hier konkrete
                                    Warm-Intro-Ideen (z. B. welcher Kollege wen kennt).
                                  </p>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={
                                  isSelectedInPipeline
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/60'
                                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-950/65'
                                }
                                disabled={isSelectedInPipeline}
                              >
                                {isSelectedInPipeline ? (
                                  <AppIcon icon={CheckmarkCircle02Icon} size={16} className="mr-1 shrink-0" />
                                ) : (
                                  <AppIcon icon={UploadIcon} size={16} className="mr-1 shrink-0" />
                                )}
                                {isSelectedInPipeline ? 'In Pipeline' : 'In Pipeline überführen'}
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
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6">
                      <div className="mx-auto w-full max-w-5xl space-y-12 border-l border-dashed border-slate-200 pl-5 sm:pl-7 dark:border-slate-700">
                          <motion.section
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative rounded-r-xl border-l-4 border-blue-500 bg-blue-50/50 py-5 pl-5 pr-4 dark:border-blue-400 dark:bg-blue-950/35"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-800/80 dark:text-blue-200/90">
                              Warum jetzt?
                            </p>
                            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                              <h2 className="text-sm font-semibold text-foreground">Insight — Kurz-Begründung</h2>
                              {signalIcpScore !== null ? (
                                <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 dark:bg-slate-950/40">
                                  <span className="text-xs font-medium text-muted-foreground">ICP-Match</span>
                                  <span className="text-lg font-bold tabular-nums text-foreground">{signalIcpScore}%</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                                        <AppIcon icon={InformationCircleIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[260px] border-border bg-popover text-popover-foreground text-xs">
                                      Basierend auf Branche, Unternehmensgröße, Signal-Typ, Aktualität und Referenz-Readiness.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : null}
                            </div>
                            <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-foreground/85 marker:text-blue-500 dark:text-blue-50/95 dark:marker:text-blue-400">
                              {executiveSummaryBullets.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </motion.section>

                          {signalEvidenceText &&
                          selected.kind === 'news' &&
                          !executiveSummaryBullets.some((b) => b === signalEvidenceText) ? (
                            <section className="space-y-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Das Signal
                              </p>
                              <div
                                className={`whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 ${
                                  signalEvidenceExpanded ? '' : 'line-clamp-3'
                                }`}
                              >
                                {signalEvidenceText}
                              </div>
                              {signalEvidenceText.length > 140 ? (
                                <Button
                                  type="button"
                                  variant="link"
                                  className="mt-1 h-auto p-0 text-xs font-medium text-blue-700 dark:text-blue-400"
                                  onClick={() => setSignalEvidenceExpanded((e) => !e)}
                                >
                                  {signalEvidenceExpanded ? 'Weniger anzeigen' : 'Weiterlesen'}
                                </Button>
                              ) : null}
                            </section>
                          ) : null}

                          <section className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Wer kontaktieren?
                                </p>
                                <h2 className="mt-1 text-base font-semibold text-foreground">Passende Ansprechpartner</h2>
                              </div>
                            </div>
                            {decisionCandidatesLoadingCompanyId === selected.companyId ? (
                              <p className="text-sm text-muted-foreground">Profile werden geladen …</p>
                            ) : decisionCandidates.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Noch keine Stakeholder-Vorschläge. Verbinde The Org, CIO.de oder LinkedIn/Sales Navigator.
                              </p>
                            ) : (
                              <>
                                <div
                                  className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35"
                                  role="list"
                                  aria-label="Passende Ansprechpartner"
                                >
                                  {displayStakeholders.map((candidate) => {
                                    const activity = formatLinkedInActivityLine(candidate.lastSeenAt)
                                    const initials = candidate.fullName
                                      .split(/\s+/)
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map((n) => n[0]?.toUpperCase() ?? '')
                                      .join('')
                                    const mutual = candidate.mutualConnections ?? 0
                                    return (
                                      <div
                                        key={candidate.id}
                                        role="listitem"
                                        className="w-[calc(100%-0.5rem)] shrink-0 snap-start rounded-2xl bg-slate-50/90 p-4 shadow-sm dark:bg-slate-900/50 sm:w-[calc((100%-0.75rem)/2)] sm:max-w-[calc((100%-0.75rem)/2)]"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                                            {initials || '—'}
                                          </div>
                                          <div className="min-w-0 flex-1 space-y-2">
                                            <div>
                                              <p className="font-semibold leading-snug text-foreground">{candidate.fullName}</p>
                                              <p className="text-xs text-muted-foreground">{candidate.title}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              <span className="font-semibold text-foreground">{candidate.confidence}%</span>
                                              {mutual > 0 ? (
                                                <>
                                                  {' '}
                                                  · {mutual}{' '}
                                                  {mutual === 1 ? 'gemeinsamer LinkedIn-Kontakt' : 'gemeinsame LinkedIn-Kontakte'}
                                                </>
                                              ) : null}
                                            </p>
                                            {activity ? (
                                              <p className="text-[11px] text-muted-foreground">LinkedIn · {activity}</p>
                                            ) : null}
                                            {candidate.profileUrl ? (
                                              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                                                <Link href={candidate.profileUrl} target="_blank" rel="noreferrer">
                                                  <AppIcon icon={ExternalLink} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                                                  LinkedIn öffnen
                                                </Link>
                                              </Button>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                {(() => {
                                  const warmTrigger = signalIntelligence?.action_triggers.find(
                                    (t) => t.type === 'warm_intro'
                                  )
                                  const bridgeLine = mutualConnectionsPreview.bridges[0]
                                  if (!warmTrigger && !bridgeLine) return null
                                  if (warmTrigger?.internalColleagueName) {
                                    return (
                                      <div className="rounded-xl border-2 border-violet-300/80 bg-violet-50/80 px-4 py-4 text-sm leading-relaxed text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-50">
                                        <p>
                                          <span className="font-semibold">Stärkster Hebel: </span>
                                          Dein Kollege {warmTrigger.internalColleagueName} kennt{' '}
                                          {warmTrigger.primaryStakeholderName} – Warm-Intro vor Kaltakquise.
                                        </p>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="mt-3 gap-1.5 bg-violet-600 hover:bg-violet-700"
                                          onClick={() =>
                                            void handleWarmIntroRequest(
                                              warmTrigger.internalColleagueName!,
                                              warmTrigger.primaryStakeholderName
                                            )
                                          }
                                        >
                                          <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                                          {warmTrigger.label}
                                        </Button>
                                      </div>
                                    )
                                  }
                                  return (
                                    <div className="rounded-xl border border-amber-200/70 bg-amber-50/65 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-50">
                                      <span className="font-semibold">Pro-Tipp: </span>
                                      {bridgeLine}
                                    </div>
                                  )
                                })()}
                              </>
                            )}
                          </section>

                          <section className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Referenzen
                                </p>
                                <h2 className="mt-1 text-base font-semibold text-foreground">Welche Story passt am besten?</h2>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={onlyApprovedReferences ? 'secondary' : 'outline'}
                                className="h-8 shrink-0 text-xs"
                                onClick={() => setOnlyApprovedReferences((prev) => !prev)}
                              >
                                Nur freigegeben
                              </Button>
                            </div>
                            {visibleQuickRefs.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {quickRefs.length > 0 && signalIntelligence?.insight.reference_line
                                  ? signalIntelligence.insight.reference_line
                                  : 'Keine Referenzen im Pool für dieses Signal-Konto.'}
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {visibleQuickRefs.map((r) => {
                                  const readiness = readinessForReference(r.status)
                                  const attached = attachedRefIds.has(r.id)
                                  const requestable = String(r.status ?? '').toLowerCase() !== 'approved'
                                  return (
                                    <div
                                      key={r.id}
                                      className="rounded-2xl bg-slate-50/80 p-5 dark:bg-slate-900/45"
                                    >
                                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                                          {r.companyLogoUrl ? (
                                            <Image
                                              src={r.companyLogoUrl}
                                              alt=""
                                              fill
                                              sizes="56px"
                                              className="object-contain p-2"
                                            />
                                          ) : (
                                            <div className="flex size-full items-center justify-center text-xs font-medium text-muted-foreground">
                                              {(r.companyName ?? '?').slice(0, 2).toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                              {readiness.legalBadgeLabel}
                                            </Badge>
                                            {requestable ? (
                                              <AppIcon icon={SquareLock02Icon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                                            ) : null}
                                          </div>
                                          <p className="text-sm font-semibold text-foreground">{r.title}</p>
                                          <p className="text-sm leading-relaxed text-muted-foreground">
                                            <span className="font-medium text-foreground">Warum diese Story zieht:</span>{' '}
                                            {referenceMatchReason(r)}
                                          </p>
                                          <div className="flex flex-wrap gap-2 pt-1">
                                            {requestable ? (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs"
                                                onClick={async () => {
                                                  const res = await requestReferenceApprovalForSignal({
                                                    referenceId: r.id,
                                                    referenceTitle: r.title,
                                                    companyName: selected?.companyName ?? '',
                                                  })
                                                  if (!res.success) {
                                                    toast.error(res.error)
                                                    return
                                                  }
                                                  toast.success('Freigabe angefragt')
                                                }}
                                              >
                                                Freigabe
                                              </Button>
                                            ) : null}
                                            <Button
                                              size="icon"
                                              variant={attached ? 'default' : 'outline'}
                                              className={`size-8 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                              onClick={() => toggleAttachedReference(r.id)}
                                              aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                            >
                                              <AppIcon icon={Paperclip} size={12} />
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                                              <Link href={ROUTES.evidence.detail(r.id)}>Referenz öffnen</Link>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </section>

                          <section className="space-y-4 pb-4">
                            {!introStrategyText && !introStrategyLoading ? (
                              <div className="flex flex-col items-center gap-3 py-4">
                                {signalIntelligence?.action_triggers
                                  .filter((t) => t.type === 'warm_intro')
                                  .map((t) => (
                                    <Button
                                      key={`warm-${t.label}`}
                                      type="button"
                                      size="lg"
                                      className="w-full max-w-lg gap-2 bg-violet-600 shadow-md hover:bg-violet-700"
                                      onClick={() =>
                                        void handleWarmIntroRequest(
                                          t.internalColleagueName ?? 'Kollege',
                                          t.primaryStakeholderName
                                        )
                                      }
                                    >
                                      <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                                      {t.label}
                                    </Button>
                                  ))}
                                {renderOutreachDraftComposer()}
                              </div>
                            ) : null}

                            {introStrategyLoading ? (
                              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                                <AppIcon icon={Loader} size={16} className="animate-spin" />
                                Entwurf wird generiert …
                              </div>
                            ) : null}

                            {introStrategyText ? (
                              <>
                                <div className="mt-6 rounded-lg bg-muted/55 px-5 py-6 shadow-inner dark:bg-muted/55">
                                  <div className="mb-3 flex flex-wrap items-center gap-2">
                                    {introStrategySource === 'openai' ? (
                                      <Badge className="h-5 px-1.5 text-[10px]">KI</Badge>
                                    ) : introStrategySource ? (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                        Regeln
                                      </Badge>
                                    ) : null}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-muted-foreground"
                                      onClick={() => void copyStrategySnippet()}
                                    >
                                      {copySuccess ? (
                                        <AppIcon icon={CopyCheckIcon} size={16} className="mr-1 shrink-0" />
                                      ) : (
                                        <AppIcon icon={CopyIcon} size={16} className="mr-1 shrink-0" />
                                      )}
                                      Kopieren
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-muted-foreground"
                                      onClick={triggerIntroDraftGeneration}
                                      disabled={introStrategyLoading}
                                    >
                                      Neu generieren
                                    </Button>
                                  </div>
                                  {renderDraftText(introStrategyText)}
                                </div>

                                <div className="mt-4 max-w-lg rounded-xl border border-border bg-card p-4">
                                  <p className="mb-2 text-xs text-muted-foreground">
                                    Andere Tonalität? Wähle unten und generiere neu.
                                  </p>
                                  {renderIntroTonePicker()}
                                </div>

                                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-[11px] dark:border-border">
                                  <button
                                    type="button"
                                    className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline dark:text-muted-foreground dark:hover:text-foreground"
                                    onClick={async () => {
                                      const key = signalKeyOf(selected)
                                      await logMarketSignalQuickAction({ signalKey: key, channel: 'hubspot_email' })
                                      window.open(
                                        `https://app.hubspot.com/contacts?query=${encodeURIComponent(selected.companyName)}`,
                                        '_blank',
                                        'noopener,noreferrer'
                                      )
                                    }}
                                  >
                                    In HubSpot öffnen
                                  </button>
                                  <span className="text-border dark:text-muted-foreground/50" aria-hidden>
                                    ·
                                  </span>
                                  <button
                                    type="button"
                                    className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline dark:text-muted-foreground dark:hover:text-foreground"
                                    onClick={async () => {
                                      const key = signalKeyOf(selected)
                                      await logMarketSignalQuickAction({ signalKey: key, channel: 'salesforce_task' })
                                      window.open('https://login.salesforce.com/', '_blank', 'noopener,noreferrer')
                                    }}
                                  >
                                    Task in Salesforce
                                  </button>
                                </div>
                              </>
                            ) : null}

                            {!introStrategyLoading && introDraftRequested && !introStrategyText ? (
                              <p className="mt-4 text-sm text-muted-foreground">Kein Entwurf verfügbar. Bitte erneut versuchen.</p>
                            ) : null}
                          </section>
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
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {selected && selectedGroup && selectedGroup.companies.length > 1 ? (
                    <div className="relative mt-0.5 flex shrink-0 -space-x-1.5">
                      {selectedGroup.companies.slice(0, 4).map((co) => (
                        <div
                          key={co.id}
                          className="relative z-10 size-8 overflow-hidden rounded-lg border-2 border-background bg-card shadow-sm ring-1 ring-border"
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
                    <div className="relative mt-0.5 size-8 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
                      <Image src={selected.companyLogoUrl} alt="" fill sizes="32px" className="object-contain p-1" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="min-w-0 truncate text-sm font-semibold leading-none text-foreground">
                      {selected?.headline ?? 'Signal'}
                    </p>
                    <div className="mt-1.5 flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden text-[11px] text-muted-foreground">
                      {selected && selectedGroup && selectedGroup.companies.length > 1 ? (
                        <span className="shrink-0">{selectedGroup.companies.length} Accounts</span>
                      ) : (
                        <span className="shrink-0">{selected?.companyName ?? ''}</span>
                      )}
                      {selected ? (
                        <>
                          <span className="shrink-0" aria-hidden>
                            •
                          </span>
                          <span
                            className="shrink-0 rounded border border-border bg-muted/50 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-foreground/85"
                            title={signalTypeLabel(selected.categoryBadge).full}
                          >
                            {signalTypeLabel(selected.categoryBadge).short}
                          </span>
                          <span className="shrink-0" aria-hidden>
                            •
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={selected.sourceHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-w-0 max-w-full items-center gap-0.5 font-medium text-blue-700 hover:underline dark:text-blue-400"
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
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                {selected ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => void submitDraftFeedback(true)}
                    aria-label="Nützlich"
                  >
                    <AppIcon icon={ThumbsUpIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => void submitDraftFeedback(false)}
                    aria-label="Nicht nützlich"
                  >
                    <AppIcon icon={ThumbsDownIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        title="Wiedervorlage, Priorität und Slack"
                        aria-label="Wiedervorlage, Priorität und Slack"
                      >
                        <AppIcon icon={Calendar} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[14rem]">
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Inbox &amp; Erinnerung
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer flex-col items-start gap-0.5 py-2"
                        onSelect={() => void toggleTodayPriority(selected)}
                      >
                        <span className="flex w-full items-center gap-2 text-sm font-medium">
                          <AppIcon icon={PinIcon} size={16} className="shrink-0 text-amber-600" aria-hidden />
                          Heute zuerst
                        </span>
                        <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                          Signal oben in der Liste priorisieren (oder Priorität wieder entfernen).
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex-col items-start gap-0.5 py-2"
                        onSelect={() => void snoozeSelected(1)}
                      >
                        <span className="flex w-full items-center gap-2 text-sm font-medium">
                          <AppIcon icon={Timer} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                          Morgen
                        </span>
                        <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                          Signal vorübergehend ausblenden und morgen wieder anzeigen.
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex-col items-start gap-0.5 py-2"
                        onSelect={() => void snoozeSelected(7)}
                      >
                        <span className="flex w-full items-center gap-2 text-sm font-medium">
                          <AppIcon icon={Calendar} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                          Nächste Woche
                        </span>
                        <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                          Eine Woche zurückstellen – weniger Lärm, später wieder dran.
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Team
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer flex-col items-start gap-0.5 py-2"
                        onSelect={async () => {
                          const key = signalKeyOf(selected)
                          await logMarketSignalQuickAction({ signalKey: key, channel: 'slack_mention' })
                          window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer')
                        }}
                      >
                        <span className="flex w-full items-center gap-2 text-sm font-medium">
                          <AppIcon icon={Message01Icon} size={16} className="shrink-0 text-violet-600" aria-hidden />
                          Slack öffnen
                        </span>
                        <span className="text-muted-foreground pl-5 text-xs font-normal leading-snug">
                          Schnellweg in Slack – z. B. Account Executive oder Team pingen (kein Auto-Post).
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selected.kind === 'exec' ? (
                    <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" asChild>
                      <Link href={selected.sourceHref} target="_blank" rel="noreferrer" aria-label="Auf LinkedIn öffnen">
                        <AppIcon icon={Linkedin01Icon} size={16} />
                      </Link>
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-8 px-2 text-xs ${
                          isSelectedInPipeline
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100'
                        }`}
                        disabled={isSelectedInPipeline}
                      >
                        {isSelectedInPipeline ? (
                          <AppIcon icon={CheckmarkCircle02Icon} size={16} className="mr-1 shrink-0" />
                        ) : (
                          <AppIcon icon={UploadIcon} size={16} className="mr-1 shrink-0" />
                        )}
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
                              setMobileOpen(false)
                            }}
                          >
                            {d.title}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
              {selected ? (
                <div className="space-y-12 border-l border-dashed border-slate-200 pl-4 dark:border-slate-700">
                  <motion.section
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-r-xl border-l-4 border-blue-500 bg-blue-50/50 py-3 pl-4 pr-3 dark:border-blue-400 dark:bg-blue-950/35"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-800/80 dark:text-blue-200/90">Warum jetzt?</p>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-foreground">Insight — Kurz-Begründung</h2>
                      {signalIcpScore !== null ? (
                        <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 dark:bg-slate-950/40">
                          <span className="text-xs font-medium text-muted-foreground">ICP-Match</span>
                          <span className="text-base font-bold tabular-nums text-foreground">{signalIcpScore}%</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                                <AppIcon icon={InformationCircleIcon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[260px] border-border bg-popover text-popover-foreground text-xs">
                              Basierend auf Branche, Unternehmensgröße, Signal-Typ, Aktualität und Referenz-Readiness.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : null}
                    </div>
                    <ul className="mt-2 list-inside list-disc space-y-1.5 text-[13px] leading-snug text-foreground/85 marker:text-blue-500 dark:text-blue-50/95 dark:marker:text-blue-400">
                      {executiveSummaryBullets.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </motion.section>
                  {signalEvidenceText &&
                  selected.kind === 'news' &&
                  !executiveSummaryBullets.some((b) => b === signalEvidenceText) ? (
                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Das Signal
                      </p>
                      <div
                        className={`mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90 ${
                          signalEvidenceExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {signalEvidenceText}
                      </div>
                      {signalEvidenceText.length > 140 ? (
                        <Button
                          type="button"
                          variant="link"
                          className="mt-1 h-auto p-0 text-xs"
                          onClick={() => setSignalEvidenceExpanded((e) => !e)}
                        >
                          {signalEvidenceExpanded ? 'Weniger anzeigen' : 'Weiterlesen'}
                        </Button>
                      ) : null}
                    </section>
                  ) : null}
                  <section className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Wer kontaktieren?
                      </p>
                      <h2 className="mt-1 text-sm font-semibold text-foreground">Passende Ansprechpartner</h2>
                    </div>
                    {decisionCandidatesLoadingCompanyId === selected.companyId ? (
                      <p className="text-sm text-muted-foreground">Profile werden geladen …</p>
                    ) : decisionCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Noch keine Stakeholder-Vorschläge. Verbinde The Org, CIO.de oder LinkedIn/Sales Navigator.
                      </p>
                    ) : (
                      <>
                        <div
                          className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35"
                          role="list"
                          aria-label="Passende Ansprechpartner"
                        >
                          {displayStakeholders.map((candidate) => {
                            const activity = formatLinkedInActivityLine(candidate.lastSeenAt)
                            const initials = candidate.fullName
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((n) => n[0]?.toUpperCase() ?? '')
                              .join('')
                            const mutual = candidate.mutualConnections ?? 0
                            return (
                              <div
                                key={candidate.id}
                                role="listitem"
                                className="w-[calc(100%-0.5rem)] shrink-0 snap-start rounded-2xl bg-slate-50/90 p-4 shadow-sm dark:bg-slate-900/50 sm:w-[calc((100%-0.75rem)/2)] sm:max-w-[calc((100%-0.75rem)/2)]"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                                    {initials || '—'}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div>
                                      <p className="font-semibold leading-snug text-foreground">{candidate.fullName}</p>
                                      <p className="text-xs text-muted-foreground">{candidate.title}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-semibold text-foreground">{candidate.confidence}%</span>
                                      {mutual > 0 ? (
                                        <>
                                          {' '}
                                          · {mutual}{' '}
                                          {mutual === 1 ? 'gemeinsamer LinkedIn-Kontakt' : 'gemeinsame LinkedIn-Kontakte'}
                                        </>
                                      ) : null}
                                    </p>
                                    {activity ? (
                                      <p className="text-[11px] text-muted-foreground">LinkedIn · {activity}</p>
                                    ) : null}
                                    {candidate.profileUrl ? (
                                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                                        <Link href={candidate.profileUrl} target="_blank" rel="noreferrer">
                                          <AppIcon icon={ExternalLink} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                                          LinkedIn öffnen
                                        </Link>
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {(() => {
                          const warmTrigger = signalIntelligence?.action_triggers.find(
                            (t) => t.type === 'warm_intro'
                          )
                          const bridgeLine = mutualConnectionsPreview.bridges[0]
                          if (!warmTrigger && !bridgeLine) return null
                          if (warmTrigger?.internalColleagueName) {
                            return (
                              <div className="rounded-xl border-2 border-violet-300/80 bg-violet-50/80 px-4 py-4 text-sm leading-relaxed text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-50">
                                <p>
                                  <span className="font-semibold">Stärkster Hebel: </span>
                                  Dein Kollege {warmTrigger.internalColleagueName} kennt{' '}
                                  {warmTrigger.primaryStakeholderName}.
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="mt-3 w-full gap-1.5 bg-violet-600 hover:bg-violet-700"
                                  onClick={() =>
                                    void handleWarmIntroRequest(
                                      warmTrigger.internalColleagueName!,
                                      warmTrigger.primaryStakeholderName
                                    )
                                  }
                                >
                                  <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                                  {warmTrigger.label}
                                </Button>
                              </div>
                            )
                          }
                          return (
                            <div className="rounded-xl border border-amber-200/70 bg-amber-50/65 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-50">
                              <span className="font-semibold">Pro-Tipp: </span>
                              {bridgeLine}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </section>

                  <section className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Referenzen
                        </p>
                        <h2 className="mt-1 text-sm font-semibold text-foreground">Welche Story passt am besten?</h2>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={onlyApprovedReferences ? 'secondary' : 'outline'}
                        className="h-8 w-full shrink-0 text-xs sm:w-auto"
                        onClick={() => setOnlyApprovedReferences((prev) => !prev)}
                      >
                        Nur freigegeben
                      </Button>
                    </div>
                    {visibleQuickRefs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {quickRefs.length > 0 && signalIntelligence?.insight.reference_line
                          ? signalIntelligence.insight.reference_line
                          : 'Keine Referenzen im Pool für dieses Signal-Konto.'}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {visibleQuickRefs.map((r) => {
                          const readiness = readinessForReference(r.status)
                          const attached = attachedRefIds.has(r.id)
                          const requestable = String(r.status ?? '').toLowerCase() !== 'approved'
                          return (
                            <div
                              key={r.id}
                              className="rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-900/45"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                                  {r.companyLogoUrl ? (
                                    <Image
                                      src={r.companyLogoUrl}
                                      alt=""
                                      fill
                                      sizes="48px"
                                      className="object-contain p-2"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center text-xs font-medium text-muted-foreground">
                                      {(r.companyName ?? '?').slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                      {readiness.legalBadgeLabel}
                                    </Badge>
                                    {requestable ? (
                                      <AppIcon icon={SquareLock02Icon} size={16} className={MS_TOOLBAR_ICON_CLASS} />
                                    ) : null}
                                  </div>
                                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                                  <p className="text-sm leading-relaxed text-muted-foreground">
                                    <span className="font-medium text-foreground">Warum diese Story zieht:</span>{' '}
                                    {referenceMatchReason(r)}
                                  </p>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {requestable ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs"
                                        onClick={async () => {
                                          const res = await requestReferenceApprovalForSignal({
                                            referenceId: r.id,
                                            referenceTitle: r.title,
                                            companyName: selected?.companyName ?? '',
                                          })
                                          if (!res.success) {
                                            toast.error(res.error)
                                            return
                                          }
                                          toast.success('Freigabe angefragt')
                                        }}
                                      >
                                        Freigabe
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="icon"
                                      variant={attached ? 'default' : 'outline'}
                                      className={`size-8 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                      onClick={() => toggleAttachedReference(r.id)}
                                      aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                    >
                                      <AppIcon icon={Paperclip} size={12} />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                                      <Link href={ROUTES.evidence.detail(r.id)}>Referenz öffnen</Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                  <section>
                    {!introStrategyText && !introStrategyLoading ? (
                      <div className="flex flex-col gap-3 py-2">
                        {signalIntelligence?.action_triggers
                          .filter((t) => t.type === 'warm_intro')
                          .map((t) => (
                            <Button
                              key={`m-warm-${t.label}`}
                              type="button"
                              size="lg"
                              className="gap-2 bg-violet-600 shadow-md hover:bg-violet-700"
                              onClick={() =>
                                void handleWarmIntroRequest(
                                  t.internalColleagueName ?? 'Kollege',
                                  t.primaryStakeholderName
                                )
                              }
                            >
                              <AppIcon icon={Sparkles} size={16} className={MS_TOOLBAR_ICON_CLASS} aria-hidden />
                              {t.label}
                            </Button>
                          ))}
                        {renderOutreachDraftComposer()}
                      </div>
                    ) : null}
                    {introStrategyLoading ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <AppIcon icon={Loader} size={16} className="animate-spin" />
                        Entwurf wird generiert …
                      </div>
                    ) : null}
                    {introStrategyText ? (
                      <>
                        <div className="mt-4 rounded-lg bg-muted/55 px-4 py-5 dark:bg-muted/55">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {introStrategySource === 'openai' ? (
                              <Badge className="h-5 px-1.5 text-[10px]">KI</Badge>
                            ) : introStrategySource ? (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                Regeln
                              </Badge>
                            ) : null}
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void copyStrategySnippet()}>
                              {copySuccess ? (
                                <AppIcon icon={CopyCheckIcon} size={16} className="mr-1 shrink-0" />
                              ) : (
                                <AppIcon icon={CopyIcon} size={16} className="mr-1 shrink-0" />
                              )}
                              Kopieren
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={triggerIntroDraftGeneration} disabled={introStrategyLoading}>
                              Neu generieren
                            </Button>
                          </div>
                          {renderDraftText(introStrategyText)}
                        </div>
                        <div className="mt-3 rounded-xl border border-border bg-card p-3">
                          <p className="mb-2 text-xs text-muted-foreground">
                            Andere Tonalität? Wähle unten und generiere neu.
                          </p>
                          {renderIntroTonePicker()}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3 text-[11px] dark:border-border">
                          <button
                            type="button"
                            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline dark:text-muted-foreground"
                            onClick={async () => {
                              const key = signalKeyOf(selected)
                              await logMarketSignalQuickAction({ signalKey: key, channel: 'hubspot_email' })
                              window.open(
                                `https://app.hubspot.com/contacts?query=${encodeURIComponent(selected.companyName)}`,
                                '_blank',
                                'noopener,noreferrer'
                              )
                            }}
                          >
                            In HubSpot öffnen
                          </button>
                          <button
                            type="button"
                            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline dark:text-muted-foreground"
                            onClick={async () => {
                              const key = signalKeyOf(selected)
                              await logMarketSignalQuickAction({ signalKey: key, channel: 'salesforce_task' })
                              window.open('https://login.salesforce.com/', '_blank', 'noopener,noreferrer')
                            }}
                          >
                            Task in Salesforce
                          </button>
                        </div>
                      </>
                    ) : null}
                    {!introStrategyLoading && introDraftRequested && !introStrategyText ? (
                      <p className="mt-3 text-sm text-muted-foreground">Kein Entwurf verfügbar. Bitte erneut versuchen.</p>
                    ) : null}
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
