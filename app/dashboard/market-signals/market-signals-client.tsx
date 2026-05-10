'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Delete02Icon,
  FilterHorizontalIcon,
  Linkedin01Icon,
  LinkIcon,
  Loader,
  News01Icon,
  Paperclip,
  Sparkles,
  StarIcon,
  UploadIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useRole } from '@/hooks/useRole'
import { CheckCircle2, CalendarDays, Copy, CopyCheck, Info, Lock, Users, ThumbsDown, ThumbsUp } from 'lucide-react'

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
  const { isAdmin, isAccountManager } = useRole()
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
  const canRunNewsIngest = isAdmin || isAccountManager
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
    if (badge === 'people') return { short: 'Executive', full: 'Executive Tracking' }
    return { short: 'Company', full: 'Company News' }
  }

  /** Erklärt die Farbe am Kartenrand und im Aktions-Stack (Grün ≠ Gelb). */
  function signalCategoryColorHint(badge: InboxItem['categoryBadge']): string {
    if (badge === 'people') {
      return 'Blau · Personen: Executive-Tracking, Führungswechsel, Presse zu Führungskräften.'
    }
    if (badge === 'finance') {
      return 'Grün · Finanz: Budget, Kennzahlen, Finanzierungen, IT-Kosten / CFO-relevante News.'
    }
    return 'Gelb · Strategie: Programme, Digitalisierung, CRM- & Tool-Rollouts, Unternehmens- und IT-Strategie.'
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

  /** Kompakte Inbox-Zeile: Signal-Art (z. B. Personalwechsel). */
  function inboxRowSignalTypeLabel(item: InboxItem): string {
    if (item.kind === 'exec') return 'Personalwechsel'
    if (item.categoryBadge === 'finance') return 'Finanzsignal'
    return 'Unternehmensnews'
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
        sourceSummary: summarizeSourceText(
          row.changeSummary || `${row.personName} in neuer Rolle bei ${row.companyName}`
        ),
        listTitlePrefix: row.personName || 'Person',
        listTitleRest: isPress ? `${row.companyName} · Executive in den Medien` : `${row.companyName} · Executive Tracking`,
        categoryBadge: 'people',
        personName: row.personName,
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
  }, [irrelevantKeys, model.executives, model.followingCompanyIds, model.news, onlyFocusAccounts, priorityKeys, restrictedSet, snoozedUntilByKey])

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
    toast.success('Feedback gespeichert')
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
        'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      dotClass: 'bg-slate-400',
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
  const executiveSummaryBullets = useMemo(() => triggerBullets.slice(0, 3), [triggerBullets])
  const signalEvidenceText = useMemo(() => {
    if (!selected) return ''
    if (selected.kind === 'news') return String(selected.body || selected.sourceSummary || '').trim()
    return String(selected.sourceSummary || '').trim()
  }, [selected])
  const isSelectedInPipeline = useMemo(() => {
    if (!selected) return false
    const ids = selectedGroup?.companies?.length
      ? selectedGroup.companies.map((c) => c.id)
      : [selected.companyId]
    return ids.some((id) => model.activeDealCompanyIds.includes(id))
  }, [model.activeDealCompanyIds, selected, selectedGroup])

  function renderDraftText(text: string | null): ReactNode {
    const content = String(text ?? '').trim()
    if (!content) return <p className="text-sm leading-relaxed text-slate-600">Keine Empfehlung verfügbar.</p>
    const paragraphs = content.split(/\n+/).filter(Boolean)
    return (
      <div className="space-y-3 font-serif text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">
        {paragraphs.map((para, pi) => {
          const parts = para.split(/(\[[^\]]+\])/g)
          return (
            <p key={pi}>
              {parts.map((part, idx) =>
                /^\[[^\]]+\]$/.test(part) ? (
                  <span
                    key={idx}
                    className="rounded px-1 font-sans text-sm font-medium text-yellow-900 dark:text-yellow-950 bg-yellow-100 dark:bg-yellow-200/90"
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
      return 'Signale können aktuell nicht synchronisiert werden: Salesforce/Supabase Service-Verbindung ist nicht vollständig konfiguriert.'
    }
    if (/nur admin/i.test(raw)) {
      return 'Nur Admins oder Account Manager können den Ingest starten.'
    }
    return raw || 'Synchronisierung konnte nicht gestartet werden.'
  }

  async function copyStrategySnippet() {
    if (!selected) return
    const text = introStrategyText?.trim() || buildIntroSnippet(selected, selectedGroup)
    await navigator.clipboard.writeText(text)
    setCopySuccess(true)
    window.setTimeout(() => setCopySuccess(false), 1200)
    toast.success('Entwurf kopiert')
  }

  function triggerIntroDraftGeneration() {
    setIntroDraftRequested(true)
    setIntroDraftRunId((prev) => prev + 1)
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
  }, [selected, introTone, quickRefs, introDraftRequested, introDraftRunId])

  return (
    <div className="space-y-5 overflow-x-hidden">
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
            <AppIcon icon={StarIcon} size={14} />
            Focus only
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
          {canRunNewsIngest ? (
            <Button
              type="button"
              variant="outline"
              size="toolbar"
              className="h-8 gap-1.5 text-xs"
              disabled={newsIngestPending}
              title="Company News + Executive-Presse (Google News RSS, inkl. Fachmedien-Suche)"
              onClick={() => {
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
              }}
            >
              {newsIngestPending ? (
                <AppIcon icon={Loader} size={14} className="animate-spin" />
              ) : (
                <AppIcon icon={News01Icon} size={14} />
              )}
              Signale abrufen
            </Button>
          ) : null}
        </div>
      </div>

      <div className="h-[calc(100vh-220px)] min-h-[540px] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={22} className="min-w-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3">
                <p className="text-sm font-semibold text-slate-900">Inbox</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-slate-500">
                    {groupedVisibleItems.length} Signale
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
                    Account
                  </Button>
                </div>
                <div className="mt-2">
                  <Input
                    value={signalFilter}
                    onChange={(e) => setSignalFilter(e.target.value)}
                    placeholder="Signale filtern..."
                    className="h-8 bg-white text-xs"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2 [scrollbar-gutter:stable] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-2">
                {groupedVisibleItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-slate-900">You&apos;re all caught up</p>
                      <p className="mt-1 text-xs text-slate-500">Keine neuen Signale in deiner Watchlist.</p>
                    </div>
                  </div>
                ) : (
                  <TooltipProvider delayDuration={250}>
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
                              const listAria = `${rep.companyName}. ${inboxRowSignalTypeLabel(rep)}. ${rep.headline}`
                              const isTodayPriority = priorityKeys.has(signalKeyOf(rep))
                              return (
                                <li key={key}>
                                  <button
                                    type="button"
                                    aria-label={listAria}
                                    title={`${relativeTime(ts)} · ${rep.headline}`}
                                    onClick={() => {
                                      setSelectedKey(key)
                                      if (isMobile) setMobileOpen(true)
                                      void markReadForGroup(groupItem.items)
                                    }}
                                    className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-2 pr-1 text-left transition-colors ${
                                      isActive ? 'bg-blue-50/90' : 'hover:bg-slate-50/90'
                                    }`}
                                  >
                                    <div className="relative flex shrink-0 -space-x-1.5">
                                      {groupItem.companies.length > 1
                                        ? groupItem.companies.slice(0, 3).map((co) => (
                                            <div
                                              key={co.id}
                                              className="relative z-10 size-8 overflow-hidden rounded-md border border-white bg-white ring-1 ring-slate-200/80"
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
                                            <div className="relative size-8 overflow-hidden rounded-md bg-white ring-1 ring-slate-200/80">
                                              <Image
                                                src={rep.companyLogoUrl}
                                                alt=""
                                                fill
                                                sizes="32px"
                                                className="object-contain p-1"
                                              />
                                            </div>
                                          ) : (
                                            <div className="size-8 rounded-md bg-slate-100 ring-1 ring-slate-200/80" />
                                          )}
                                      {groupItem.companies.length > 3 ? (
                                        <span className="z-20 inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[9px] font-semibold text-slate-600">
                                          +{groupItem.companies.length - 3}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-1 text-xs font-semibold text-slate-900">
                                        {groupItem.companies.length > 1
                                          ? `${groupItem.companies.length} Accounts`
                                          : rep.companyName}
                                      </p>
                                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                                        {inboxRowSignalTypeLabel(rep)}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 pr-0.5">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span
                                            className={`size-2.5 shrink-0 rounded-full ${
                                              isTodayPriority ? 'bg-amber-500' : 'bg-slate-300/80'
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
                                      <div className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md bg-white/95 px-0.5 py-0.5 opacity-0 shadow-sm ring-1 ring-slate-200/60 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 dark:bg-slate-900/95 dark:ring-slate-700">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
                                              className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                              aria-label="KI-Intro-Snippet kopieren"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                void navigator.clipboard.writeText(buildIntroSnippet(rep, groupItem))
                                                toast.success('AI-Intro-Snippet kopiert.')
                                              }}
                                            >
                                              <AppIcon icon={Sparkles} size={14} />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="max-w-[220px] text-xs">
                                            KI-Intro-Snippet in die Zwischenablage kopieren.
                                          </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span
                                              role="img"
                                              aria-label={signalCategoryColorHint(rep.categoryBadge)}
                                              className="inline-flex size-6 cursor-help items-center justify-center rounded border border-slate-200 bg-white text-slate-600"
                                              tabIndex={-1}
                                            >
                                              {rep.categoryBadge === 'people' ? (
                                                <AppIcon icon={UserMultipleIcon} size={13} className="text-blue-600" />
                                              ) : rep.categoryBadge === 'finance' ? (
                                                <span className="inline-flex size-3 rounded-sm bg-emerald-500" />
                                              ) : (
                                                <span className="inline-flex size-2.5 rotate-45 rounded-[1px] bg-amber-400" />
                                              )}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="max-w-[240px] text-xs leading-snug">
                                            Signal-Kategorie: {signalCategoryColorHint(rep.categoryBadge)}
                                          </TooltipContent>
                                        </Tooltip>
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
                  </TooltipProvider>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={70} minSize={45} className="hidden lg:block">
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
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="shrink-0 border-b border-slate-200 px-6 py-4">
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
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{selected.headline}</p>
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void submitDraftFeedback(true)} aria-label="Nützlich">
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void submitDraftFeedback(false)} aria-label="Nicht nützlich">
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
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
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Aktionen">
                                <CalendarDays className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => void toggleTodayPriority(selected)}>
                                Heute zuerst
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void snoozeSelected(1)}>Morgen</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void snoozeSelected(7)}>Nächste Woche</DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={async () => {
                                  const key = signalKeyOf(selected)
                                  await logMarketSignalQuickAction({ signalKey: key, channel: 'slack_mention' })
                                  window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer')
                                }}
                              >
                                Slack @AE
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {selected.kind === 'exec' ? (
                            <Button type="button" variant="ghost" size="icon" asChild>
                              <Link href={selected.sourceHref} target="_blank" rel="noreferrer" aria-label="Auf LinkedIn öffnen">
                                <AppIcon icon={Linkedin01Icon} size={16} />
                              </Link>
                            </Button>
                          ) : null}
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-md text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                                  aria-label="Gemeinsame Kontakte und Warm-Intro-Pfade"
                                >
                                  <Users className="h-4 w-4 text-slate-600" aria-hidden />
                                  {mutualConnectionsPreview.count > 0 ? (
                                    <span className="ml-0.5 font-medium tabular-nums text-slate-800 dark:text-slate-100">
                                      {mutualConnectionsPreview.count}
                                    </span>
                                  ) : null}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              >
                                <p className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">Gemeinsame Kontakte</p>
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
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={
                                  isSelectedInPipeline
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }
                                disabled={isSelectedInPipeline}
                              >
                                {isSelectedInPipeline ? <CheckCircle2 className="mr-1 h-4 w-4" /> : <AppIcon icon={UploadIcon} size={16} />}
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

                    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">
                      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start lg:gap-10">
                        <div className="min-w-0 space-y-12 border-l border-dashed border-slate-200 pl-6 dark:border-slate-700">
                          <motion.section
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative rounded-r-lg border-l-4 border-blue-500 bg-blue-50/50 py-4 pl-5 pr-4 dark:border-blue-400 dark:bg-blue-950/20"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-800/80 dark:text-blue-200/90">
                              Why call now?
                            </p>
                            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">The Insight</h2>
                              {signalIcpScore !== null ? (
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">ICP</span>
                                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{signalIcpScore}%</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[260px] text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                      Basierend auf Branche, Unternehmensgröße, Signal-Typ, Aktualität und Referenz-Readiness.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : null}
                            </div>
                            <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700 marker:text-blue-400 dark:text-slate-300">
                              {executiveSummaryBullets.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </motion.section>

                          <section>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Evidence</p>
                            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">The Signal</h2>
                            <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-600 dark:text-slate-400">{selected.headline}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Quelle{' '}
                              <Link
                                href={selected.sourceHref}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                              >
                                {selected.sourceLabel}
                              </Link>
                            </p>
                            {signalEvidenceText ? (
                              <>
                                <div
                                  className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${
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
                              </>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">Kein Signaltext hinterlegt.</p>
                            )}
                          </section>

                          <section>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Outreach</p>
                            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">The Output</h2>
                            <p className="mt-1 text-xs text-slate-500">E-Mail-Entwurf — Platzhalter markieren offene Personalisierung.</p>

                            {!introStrategyText && !introStrategyLoading ? (
                              <div className="mt-8 flex flex-col items-center justify-center py-6">
                                <Button
                                  type="button"
                                  size="lg"
                                  className="gap-2 px-8 shadow-md"
                                  onClick={triggerIntroDraftGeneration}
                                >
                                  <span aria-hidden>🪄</span>
                                  Outreach-Draft generieren
                                </Button>
                              </div>
                            ) : null}

                            {introStrategyLoading ? (
                              <div className="mt-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <AppIcon icon={Loader} size={16} className="animate-spin" />
                                Entwurf wird generiert …
                              </div>
                            ) : null}

                            {introStrategyText ? (
                              <>
                                <div className="mt-6 rounded-lg bg-slate-50/90 px-5 py-6 shadow-inner dark:bg-slate-900/40">
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
                                      className="h-7 px-2 text-xs text-slate-600"
                                      onClick={() => void copyStrategySnippet()}
                                    >
                                      {copySuccess ? <CopyCheck className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                                      Kopieren
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-slate-600"
                                      onClick={triggerIntroDraftGeneration}
                                      disabled={introStrategyLoading}
                                    >
                                      Neu generieren
                                    </Button>
                                  </div>
                                  {renderDraftText(introStrategyText)}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  {([
                                    ['challenging', 'Herausfordernd'],
                                    ['advisory', 'Beratend'],
                                    ['concise', 'Kurz & Knapp'],
                                  ] as const).map(([value, label]) => (
                                    <Button
                                      key={value}
                                      type="button"
                                      size="sm"
                                      variant={introTone === value ? 'secondary' : 'outline'}
                                      className="h-8 px-3 text-xs"
                                      onClick={() => setIntroTone(value)}
                                    >
                                      {label}
                                    </Button>
                                  ))}
                                </div>

                                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-[11px] dark:border-slate-800">
                                  <button
                                    type="button"
                                    className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
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
                                  <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                                    ·
                                  </span>
                                  <button
                                    type="button"
                                    className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
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
                              <p className="mt-4 text-sm text-slate-500">Kein Entwurf verfügbar. Bitte erneut versuchen.</p>
                            ) : null}
                          </section>
                        </div>

                        <aside className="min-w-0 space-y-4 lg:sticky lg:top-8 lg:self-start">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sidekick</p>
                              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stakeholder & Referenzen</h2>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={onlyApprovedReferences ? 'secondary' : 'ghost'}
                              className="h-7 shrink-0 text-[10px]"
                              onClick={() => setOnlyApprovedReferences((prev) => !prev)}
                            >
                              Nur freigegeben
                            </Button>
                          </div>

                          {decisionCandidatesLoadingCompanyId === selected.companyId ? (
                            <p className="text-sm text-slate-500">Profile werden geladen …</p>
                          ) : decisionCandidates.length === 0 && visibleQuickRefs.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              Noch keine Stakeholder-Vorschläge. Verbinde The Org, CIO.de oder LinkedIn/Sales Navigator.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {decisionCandidates.map((candidate, idx) => {
                                const pairedRef = visibleQuickRefs[idx]
                                const activity = formatLinkedInActivityLine(candidate.lastSeenAt)
                                const initials = candidate.fullName
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((n) => n[0]?.toUpperCase() ?? '')
                                  .join('')
                                return (
                                  <div
                                    key={candidate.id}
                                    className="rounded-lg bg-slate-50/90 px-3 py-3 dark:bg-slate-900/35"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                                        {initials || '—'}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {candidate.fullName}
                                        </p>
                                        <p className="truncate text-xs text-slate-600 dark:text-slate-400">{candidate.title}</p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                          <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-800 ring-1 ring-blue-100 dark:bg-slate-800 dark:text-blue-200 dark:ring-blue-900/50">
                                            Match {candidate.confidence}%
                                          </span>
                                          {candidate.profileUrl ? (
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" asChild>
                                              <Link href={candidate.profileUrl} target="_blank" rel="noreferrer">
                                                Profil
                                              </Link>
                                            </Button>
                                          ) : null}
                                        </div>
                                        {activity ? (
                                          <p className="mt-1 text-[10px] text-slate-500">
                                            LinkedIn · {activity}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                    {pairedRef ? (
                                      <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-700">
                                        {(() => {
                                          const readiness = readinessForReference(pairedRef.status)
                                          const attached = attachedRefIds.has(pairedRef.id)
                                          const requestable = String(pairedRef.status ?? '').toLowerCase() !== 'approved'
                                          return (
                                            <>
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                {requestable ? <Lock className="h-3 w-3 text-slate-500" /> : null}
                                                <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                                  {readiness.legalBadgeLabel}
                                                </Badge>
                                              </div>
                                              <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                                                {pairedRef.title}
                                              </p>
                                              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
                                                {referenceMatchReason(pairedRef)}
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-1">
                                                {requestable ? (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-[10px]"
                                                    onClick={async () => {
                                                      const res = await requestReferenceApprovalForSignal({
                                                        referenceId: pairedRef.id,
                                                        referenceTitle: pairedRef.title,
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
                                                  className={`size-7 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                                  onClick={() => toggleAttachedReference(pairedRef.id)}
                                                  aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                                >
                                                  <AppIcon icon={Paperclip} size={12} />
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                                                  <Link href={ROUTES.evidence.detail(pairedRef.id)}>Öffnen</Link>
                                                </Button>
                                              </div>
                                            </>
                                          )
                                        })()}
                                      </div>
                                    ) : (
                                      <p className="mt-3 border-t border-slate-200/80 pt-3 text-[10px] text-slate-500 dark:border-slate-700">
                                        Keine Referenz für diesen Slot gematcht.
                                      </p>
                                    )}
                                  </div>
                                )
                              })}

                              {decisionCandidates.length === 0 && visibleQuickRefs.length > 0
                                ? visibleQuickRefs.map((r) => {
                                    const readiness = readinessForReference(r.status)
                                    const attached = attachedRefIds.has(r.id)
                                    const requestable = String(r.status ?? '').toLowerCase() !== 'approved'
                                    return (
                                      <div key={r.id} className="rounded-lg bg-slate-50/90 px-3 py-3 dark:bg-slate-900/35">
                                        <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                          {readiness.legalBadgeLabel}
                                        </Badge>
                                        <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-800 dark:text-slate-200">{r.title}</p>
                                        <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{referenceMatchReason(r)}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {requestable ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 text-[10px]"
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
                                            className={`size-7 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                            onClick={() => toggleAttachedReference(r.id)}
                                            aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                          >
                                            <AppIcon icon={Paperclip} size={12} />
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                                            <Link href={ROUTES.evidence.detail(r.id)}>Öffnen</Link>
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })
                                : visibleQuickRefs.length > decisionCandidates.length
                                  ? visibleQuickRefs.slice(decisionCandidates.length).map((r) => {
                                      const readiness = readinessForReference(r.status)
                                      return (
                                        <div key={r.id} className="rounded-lg bg-slate-50/60 px-3 py-2 dark:bg-slate-900/25">
                                          <p className="text-[10px] font-semibold uppercase text-slate-400">Weitere Referenz</p>
                                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-700 dark:text-slate-300">{r.title}</p>
                                          <Badge variant="outline" className={`mt-1 text-[9px] font-semibold ${readiness.legalBadgeClassName}`}>
                                            {readiness.legalBadgeLabel}
                                          </Badge>
                                        </div>
                                      )
                                    })
                                  : null}
                            </div>
                          )}
                        </aside>
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
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{selected?.headline ?? 'Signal'}</p>
                      {selected ? (
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void submitDraftFeedback(true)} aria-label="Nützlich">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void submitDraftFeedback(false)} aria-label="Nicht nützlich">
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
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
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Aktionen">
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => void toggleTodayPriority(selected)}>Heute zuerst</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void snoozeSelected(1)}>Morgen</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void snoozeSelected(7)}>Nächste Woche</DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={async () => {
                          const key = signalKeyOf(selected)
                          await logMarketSignalQuickAction({ signalKey: key, channel: 'slack_mention' })
                          window.open('https://slack.com/app_redirect', '_blank', 'noopener,noreferrer')
                        }}
                      >
                        Slack @AE
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selected.kind === 'exec' ? (
                    <Button type="button" variant="ghost" size="icon" asChild>
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
                        className={`h-8 px-2 text-xs ${isSelectedInPipeline ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}
                        disabled={isSelectedInPipeline}
                      >
                        {isSelectedInPipeline ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AppIcon icon={UploadIcon} size={14} />}
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
                <div className="space-y-10 border-l border-dashed border-slate-200 pl-4 dark:border-slate-700">
                  <motion.section
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-r-lg border-l-4 border-blue-500 bg-blue-50/50 py-3 pl-4 pr-3 dark:border-blue-400 dark:bg-blue-950/20"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-800/80 dark:text-blue-200/90">Why call now?</p>
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">The Insight</h2>
                      {signalIcpScore !== null ? (
                        <span className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">{signalIcpScore}%</span>
                      ) : null}
                    </div>
                    <ul className="mt-2 list-inside list-disc space-y-1.5 text-[13px] leading-snug text-slate-700 marker:text-blue-400 dark:text-slate-300">
                      {executiveSummaryBullets.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </motion.section>
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Evidence</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">The Signal</h2>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-600 dark:text-slate-400">{selected.headline}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Quelle{' '}
                      <Link href={selected.sourceHref} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                        {selected.sourceLabel}
                      </Link>
                    </p>
                    {signalEvidenceText ? (
                      <>
                        <div
                          className={`mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 ${
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
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Kein Signaltext hinterlegt.</p>
                    )}
                  </section>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sidekick</p>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stakeholder & Referenzen</h2>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={onlyApprovedReferences ? 'secondary' : 'ghost'}
                        className="h-7 text-[10px]"
                        onClick={() => setOnlyApprovedReferences((prev) => !prev)}
                      >
                        Nur freigegeben
                      </Button>
                    </div>
                    {decisionCandidatesLoadingCompanyId === selected.companyId ? (
                      <p className="text-sm text-slate-500">Profile werden geladen …</p>
                    ) : decisionCandidates.length === 0 && visibleQuickRefs.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Noch keine Stakeholder-Vorschläge. Verbinde The Org, CIO.de oder LinkedIn/Sales Navigator.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {decisionCandidates.map((candidate, idx) => {
                          const pairedRef = visibleQuickRefs[idx]
                          const activity = formatLinkedInActivityLine(candidate.lastSeenAt)
                          const initials = candidate.fullName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n) => n[0]?.toUpperCase() ?? '')
                            .join('')
                          return (
                            <div key={candidate.id} className="rounded-lg bg-slate-50/90 px-3 py-3 dark:bg-slate-900/35">
                              <div className="flex items-start gap-2">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                                  {initials || '—'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{candidate.fullName}</p>
                                  <p className="truncate text-xs text-slate-600 dark:text-slate-400">{candidate.title}</p>
                                  <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-800 ring-1 ring-blue-100 dark:bg-slate-800 dark:text-blue-200">
                                    Match {candidate.confidence}%
                                  </span>
                                  {activity ? <p className="mt-1 text-[10px] text-slate-500">LinkedIn · {activity}</p> : null}
                                </div>
                              </div>
                              {pairedRef ? (
                                <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-700">
                                  {(() => {
                                    const readiness = readinessForReference(pairedRef.status)
                                    const attached = attachedRefIds.has(pairedRef.id)
                                    const requestable = String(pairedRef.status ?? '').toLowerCase() !== 'approved'
                                    return (
                                      <>
                                        <div className="flex flex-wrap items-center gap-1">
                                          {requestable ? <Lock className="h-3 w-3 text-slate-500" /> : null}
                                          <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                            {readiness.legalBadgeLabel}
                                          </Badge>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-800 dark:text-slate-200">{pairedRef.title}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {requestable ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 text-[10px]"
                                              onClick={async () => {
                                                const res = await requestReferenceApprovalForSignal({
                                                  referenceId: pairedRef.id,
                                                  referenceTitle: pairedRef.title,
                                                  companyName: selected?.companyName ?? '',
                                                })
                                                if (!res.success) return toast.error(res.error)
                                                toast.success('Freigabe angefragt')
                                              }}
                                            >
                                              Freigabe
                                            </Button>
                                          ) : null}
                                          <Button
                                            size="icon"
                                            variant={attached ? 'default' : 'outline'}
                                            className={`size-7 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                            onClick={() => toggleAttachedReference(pairedRef.id)}
                                            aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                          >
                                            <AppIcon icon={Paperclip} size={12} />
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                                            <Link href={ROUTES.evidence.detail(pairedRef.id)}>Öffnen</Link>
                                          </Button>
                                        </div>
                                      </>
                                    )
                                  })()}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                        {decisionCandidates.length === 0
                          ? visibleQuickRefs.map((r) => {
                              const readiness = readinessForReference(r.status)
                              const attached = attachedRefIds.has(r.id)
                              const requestable = String(r.status ?? '').toLowerCase() !== 'approved'
                              return (
                                <div key={r.id} className="rounded-lg bg-slate-50/90 px-3 py-3 dark:bg-slate-900/35">
                                  <Badge variant="outline" className={`text-[10px] font-semibold ${readiness.legalBadgeClassName}`}>
                                    {readiness.legalBadgeLabel}
                                  </Badge>
                                  <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">{r.title}</p>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {requestable ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px]"
                                        onClick={async () => {
                                          const res = await requestReferenceApprovalForSignal({
                                            referenceId: r.id,
                                            referenceTitle: r.title,
                                            companyName: selected?.companyName ?? '',
                                          })
                                          if (!res.success) return toast.error(res.error)
                                          toast.success('Freigabe angefragt')
                                        }}
                                      >
                                        Freigabe
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="icon"
                                      variant={attached ? 'default' : 'outline'}
                                      className={`size-7 ${attached ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                      onClick={() => toggleAttachedReference(r.id)}
                                      aria-label={attached ? 'Aus Intro entfernen' : 'An Intro anhängen'}
                                    >
                                      <AppIcon icon={Paperclip} size={12} />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                                      <Link href={ROUTES.evidence.detail(r.id)}>Öffnen</Link>
                                    </Button>
                                  </div>
                                </div>
                              )
                            })
                          : null}
                      </div>
                    )}
                  </section>
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Outreach</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">The Output</h2>
                    {!introStrategyText && !introStrategyLoading ? (
                      <div className="mt-6 flex justify-center py-4">
                        <Button type="button" size="lg" className="gap-2 px-6 shadow-md" onClick={triggerIntroDraftGeneration}>
                          <span aria-hidden>🪄</span>
                          Outreach-Draft generieren
                        </Button>
                      </div>
                    ) : null}
                    {introStrategyLoading ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        <AppIcon icon={Loader} size={16} className="animate-spin" />
                        Entwurf wird generiert …
                      </div>
                    ) : null}
                    {introStrategyText ? (
                      <>
                        <div className="mt-4 rounded-lg bg-slate-50/90 px-4 py-5 dark:bg-slate-900/40">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {introStrategySource === 'openai' ? (
                              <Badge className="h-5 px-1.5 text-[10px]">KI</Badge>
                            ) : introStrategySource ? (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                Regeln
                              </Badge>
                            ) : null}
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void copyStrategySnippet()}>
                              {copySuccess ? <CopyCheck className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                              Kopieren
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={triggerIntroDraftGeneration} disabled={introStrategyLoading}>
                              Neu generieren
                            </Button>
                          </div>
                          {renderDraftText(introStrategyText)}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {([
                            ['challenging', 'Herausfordernd'],
                            ['advisory', 'Beratend'],
                            ['concise', 'Kurz & Knapp'],
                          ] as const).map(([value, label]) => (
                            <Button
                              key={value}
                              type="button"
                              size="sm"
                              variant={introTone === value ? 'secondary' : 'outline'}
                              className="h-8 px-3 text-xs"
                              onClick={() => setIntroTone(value)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                          <button
                            type="button"
                            className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400"
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
                            className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400"
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
                      <p className="mt-3 text-sm text-slate-500">Kein Entwurf verfügbar. Bitte erneut versuchen.</p>
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
