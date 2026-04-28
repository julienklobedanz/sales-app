'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  FilterHorizontalIcon,
  InformationCircleIcon,
  Linkedin01Icon,
  LinkIcon,
  Sparkles,
  UploadIcon,
} from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { CheckIcon } from '@/components/ui/check-icon'
import type { MarketSignalsPageModel } from '@/app/dashboard/market-signals/data'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import {
  addMarketSignalToDeal,
  markMarketSignalNotificationsRead,
  markMarketSignalsIrrelevant,
} from '@/app/dashboard/market-signals/actions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function MarketSignalsClient({ model }: { model: MarketSignalsPageModel }) {
  const [onlyActiveDeals, setOnlyActiveDeals] = useState(false)
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
      }

  function relativeTime(iso: string) {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return '—'
    const diff = Math.max(0, Date.now() - t)
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
        headline: extractHeadline(row.body),
        body: row.body,
        publishedOn: row.publishedOn,
        sourceLabel: row.sourceLabel?.trim() ? String(row.sourceLabel) : 'Google News',
        sourceHref: href,
      }
    })

    const merged = [...execItems, ...newsItems]
      .filter((x) => (restrictedSet ? restrictedSet.has(x.companyId) : true))
      .filter((x) => model.followingCompanyIds.includes(x.companyId))
      .filter((x) => !irrelevantKeys.has(`${x.kind === 'exec' ? 'market_exec' : 'market_news'}:${x.id}`))
      .sort((a, b) => {
        const aT = new Date(a.kind === 'exec' ? a.detectedAt : a.publishedOn).getTime()
        const bT = new Date(b.kind === 'exec' ? b.detectedAt : b.publishedOn).getTime()
        return bT - aT
      })
    return merged
  }, [irrelevantKeys, model.executives, model.followingCompanyIds, model.news, restrictedSet])

  const grouped = useMemo(() => {
    const buckets: Record<string, InboxItem[]> = { Heute: [], Gestern: [], Ältere: [] }
    for (const it of items) {
      const ts = it.kind === 'exec' ? it.detectedAt : it.publishedOn
      const g = groupLabel(ts)
      buckets[g] = buckets[g] ?? []
      buckets[g].push(it)
    }
    return buckets
  }, [items])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = useMemo(() => items.find((x) => `${x.kind}:${x.id}` === selectedKey) ?? null, [items, selectedKey])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [addToDealPendingId, setAddToDealPendingId] = useState<string | null>(null)

  async function markReadForItem(item: InboxItem) {
    const key = `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
    if (readKeys.has(key)) return
    const next = new Set(readKeys)
    next.add(key)
    setReadKeys(next)
    const result = await markMarketSignalNotificationsRead([key])
    if (!result.success) toast.error(result.error ?? 'Konnte Signal nicht als gelesen markieren')
  }

  async function dismissItem(item: InboxItem) {
    const key = `${item.kind === 'exec' ? 'market_exec' : 'market_news'}:${item.id}`
    const next = new Set(irrelevantKeys)
    next.add(key)
    setIrrelevantKeys(next)
    const result = await markMarketSignalsIrrelevant([key])
    if (!result.success) toast.error(result.error ?? 'Signal konnte nicht archiviert werden')
  }

  const quickRefs = useMemo(() => {
    if (!selected) return []
    return model.referenceSnippetsByCompanyId[selected.companyId] ?? []
  }, [model.referenceSnippetsByCompanyId, selected])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm shadow-slate-900/5">
        <div className="flex min-w-0 items-start gap-2.5 text-sm text-muted-foreground">
          <AppIcon icon={InformationCircleIcon} size={16} className="mt-0.5 shrink-0" />
          <p className="min-w-0">
            <span className="font-medium text-foreground">Watchlist-Logik:</span> Unternehmen folgen für Account News,
            Personen folgen für Executive Moves.
          </p>
        </div>
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
          <Button variant="ghost" size="toolbar" className="h-8 px-3 text-muted-foreground hover:bg-muted/70" asChild>
            <Link href={`${ROUTES.marketSignalsManage}?view=champions`}>
              <AppIcon icon={Sparkles} size={14} />
              Champions verwalten
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
                <p className="text-xs text-slate-500">{items.length} Signale</p>
              </div>
              <div className="h-[calc(100%-3rem)] overflow-y-auto p-2">
                {items.length === 0 ? (
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
                            {(grouped[label] ?? []).map((it) => {
                              const key = `${it.kind}:${it.id}`
                              const isActive = key === selectedKey
                              const readKey = `${it.kind === 'exec' ? 'market_exec' : 'market_news'}:${it.id}`
                              const ts = it.kind === 'exec' ? it.detectedAt : it.publishedOn
                              return (
                                <li key={key}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedKey(key)
                                      setMobileOpen(true)
                                      void markReadForItem(it)
                                    }}
                                    className={`group relative flex w-full items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-left transition-colors ${
                                      isActive
                                        ? 'border-blue-200 bg-blue-50'
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {isActive ? (
                                      <span className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-blue-600" />
                                    ) : null}
                                    <div className="relative size-7 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                                      {it.companyLogoUrl ? (
                                        <Image
                                          src={it.companyLogoUrl}
                                          alt=""
                                          fill
                                          sizes="28px"
                                          className="object-contain p-1"
                                        />
                                      ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium text-slate-900">{it.headline}</p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">{relativeTime(ts)}</p>
                                    </div>
                                    <div className="relative shrink-0">
                                      {!readKeys.has(readKey) ? (
                                        <span className="absolute -left-2 top-1/2 size-2 -translate-y-1/2 rounded-full bg-blue-500" />
                                      ) : null}
                                      <button
                                        type="button"
                                        className="ml-1 inline-flex size-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-white hover:text-slate-700 group-hover:opacity-100"
                                        aria-label="Archivieren"
                                        title="Archivieren"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          void dismissItem(it)
                                        }}
                                      >
                                        <CheckIcon className="size-4" />
                                      </button>
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
                      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <AppIcon icon={Sparkles} size={18} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">Kein Signal ausgewählt</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Wähle ein Signal aus, um Details und passende Referenzen zu sehen.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="relative mt-0.5 size-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {selected.companyLogoUrl ? (
                              <Image
                                src={selected.companyLogoUrl}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-contain p-1.5"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{selected.headline}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{selected.companyName}</span>
                              <span aria-hidden>•</span>
                              <Link
                                href={selected.sourceHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                              >
                                <AppIcon icon={LinkIcon} size={14} />
                                via {selected.sourceLabel}
                              </Link>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={ROUTES.accountsDetail(selected.companyId)}>
                            Zum Account
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why now?</p>
                          <p className="mt-2 text-sm text-slate-700">
                            {selected.kind === 'exec'
                              ? 'Ein Executive Move kann ein starkes Buying-Signal sein – ideal für eine warme Reaktivierung oder Intro an ein High-Intent Account.'
                              : 'Account News kann Timing- und Prioritäts-Signale liefern – nutze das Update für einen relevanten Aufhänger im Outreach.'}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Matches</p>
                          {quickRefs.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">Noch keine Referenzen für diesen Account gefunden.</p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {quickRefs.slice(0, 2).map((r) => (
                                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {r.industry ?? '—'} · {r.status}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={ROUTES.evidence.detail(r.id)}>Öffnen</Link>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {selected.kind === 'news' ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signal</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                            {selected.body}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          onClick={() => toast.success('Intro-Draft (P2): Wird mit KI-Flow verbunden.')}
                        >
                          <AppIcon icon={Sparkles} size={16} />
                          Intro-Draft generieren
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" className="gap-2">
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
                                      await dismissItem(selected)
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
          <div className="h-full overflow-hidden bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selected?.headline ?? 'Signal'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{selected?.companyName ?? ''}</p>
                </div>
                {selected ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={ROUTES.accountsDetail(selected.companyId)}>Account</Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="h-[calc(100%-3.25rem)] overflow-y-auto px-4 py-4">
              {selected ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why now?</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selected.kind === 'exec'
                        ? 'Ein Executive Move kann ein starkes Buying-Signal sein – ideal für eine warme Reaktivierung oder Intro.'
                        : 'Account News kann Timing- und Prioritäts-Signale liefern – nutze das Update als Outreach-Aufhänger.'}
                    </p>
                    <div className="mt-3">
                      <Link
                        href={selected.sourceHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                      >
                        <AppIcon icon={LinkIcon} size={16} />
                        Quelle öffnen
                      </Link>
                    </div>
                  </div>

                  {selected.kind === 'news' ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signal</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {selected.body}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
