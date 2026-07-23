'use client'

/**
 * Smart-Match — Layout aus dem Wireframe
 * `refstack-vault/03_Design-UX/finden-page-wireframe.html`, auf App-Tokens/Primitives.
 *
 * Stufe A: Smart Search ist live an `matchReferences` gebunden; Treffer werden über
 * die bestehende, voll verdrahtete `MatchResultCard` gerendert (PDF/Share/→Deal/KI-Entwurf).
 * Offen (mit `TODO(wiring:*)` markiert): Deal-Kontext-Picker (B), Filter (C).
 */

import { useState, useLayoutEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowUp, ChevronDown, Plus, RotateCcw } from 'lucide-react'
import { Loader } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { COPY } from '@/lib/copy'
import { CheckIcon } from '@/components/ui/check-icon'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MASTER_INDUSTRIES, formatIndustryDisplay } from '@/lib/constants/industries'
import { MatchResultSkeleton } from '@/components/dashboard/match-result-skeleton'
import { MatchResultCard } from '@/app/dashboard/deals/components/match-result-card'
import {
  matchReferences,
  type MatchReferenceHit,
  type MatchReferenceFilters,
} from '@/app/dashboard/actions'
import type { DealRow } from '@/app/dashboard/deals/types'
import { cn } from '@/lib/utils'
import { parseSmartMatchQuery } from '@/lib/match/parse-smart-match-query'
import {
  VOLUME_BAND_OPTIONS,
  volumeBandFromMinVolume,
  rpcVolumeBoundsFromBands,
  rpcRecencyBoundsFromMonthsBackList,
  type VolumeBandId,
} from '@/lib/match/smart-match-multi-filters'

const SUGGESTIONS = [
  { label: '>2 Mio €', q: 'Projekte über 2 Mio Euro im Enterprise-Umfeld' },
  { label: 'ISO 27001', q: 'ISO 27001 Security Nachweise und Zertifikate' },
  { label: 'Managed Services', q: 'Managed Services 24/7 für Industrieunternehmen' },
]

/* ---------- Filter (Stufe C) ---------- */

type FiltersState = {
  industries: string[]
  volumeBands: VolumeBandId[]
  statuses: string[]
  monthsBackList: number[]
}
const EMPTY_FILTERS: FiltersState = {
  industries: [],
  volumeBands: [],
  statuses: [],
  monthsBackList: [],
}

/** Session-Persistenz: Browser-Zurück nach Referenz-Details behält Treffer. */
const SMART_MATCH_SESSION_KEY = 'refstack:smart-match:last-search:v3'

type SmartMatchSessionState = {
  query: string
  filters: FiltersState
  selectedDealId: string | null
  results: MatchReferenceHit[]
}

function normalizeFilters(raw: Partial<FiltersState> | undefined): FiltersState {
  const legacy = raw as Partial<FiltersState> & {
    minVolume?: number | null
    maxVolume?: number | null
    monthsBack?: number | null
  }
  let volumeBands = Array.isArray(legacy?.volumeBands)
    ? legacy.volumeBands.filter((b): b is VolumeBandId =>
        VOLUME_BAND_OPTIONS.some((o) => o.value === b)
      )
    : []
  if (!volumeBands.length) {
    if (typeof legacy?.maxVolume === 'number' && legacy.minVolume == null) {
      volumeBands = ['lt1']
    } else if (typeof legacy?.minVolume === 'number') {
      const band = volumeBandFromMinVolume(legacy.minVolume)
      if (band) volumeBands = [band]
    }
  }
  let monthsBackList = Array.isArray(legacy?.monthsBackList)
    ? legacy.monthsBackList.filter((n): n is number => typeof n === 'number')
    : []
  if (!monthsBackList.length && typeof legacy?.monthsBack === 'number') {
    monthsBackList = [legacy.monthsBack]
  }
  return {
    industries: Array.isArray(legacy?.industries) ? legacy.industries.map(String) : [],
    volumeBands,
    statuses: Array.isArray(legacy?.statuses) ? legacy.statuses.map(String) : [],
    monthsBackList,
  }
}

function readSmartMatchSession(): SmartMatchSessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      sessionStorage.getItem(SMART_MATCH_SESSION_KEY) ??
      sessionStorage.getItem('refstack:smart-match:last-search:v2')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SmartMatchSessionState>
    if (typeof parsed.query !== 'string' || !Array.isArray(parsed.results)) return null
    return {
      query: parsed.query,
      filters: normalizeFilters(parsed.filters),
      selectedDealId:
        typeof parsed.selectedDealId === 'string' ? parsed.selectedDealId : null,
      results: parsed.results as MatchReferenceHit[],
    }
  } catch {
    return null
  }
}

function writeSmartMatchSession(state: SmartMatchSessionState | null) {
  if (typeof window === 'undefined') return
  try {
    if (!state) {
      sessionStorage.removeItem(SMART_MATCH_SESSION_KEY)
      return
    }
    sessionStorage.setItem(SMART_MATCH_SESSION_KEY, JSON.stringify(state))
  } catch {
    // Quota / private mode — Suche funktioniert weiter ohne Persistenz.
  }
}

const RECENCY_OPTIONS: { label: string; value: number }[] = [
  { label: 'Letzte 12 Monate', value: 12 },
  { label: 'Letzte 24 Monate', value: 24 },
  { label: 'Letzte 36 Monate', value: 36 },
  { label: 'Älter als 36 Monate', value: -36 },
]
const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Freigegeben', value: 'approved' },
  { label: 'Intern', value: 'internal_only' },
  { label: 'Anonymisiert', value: 'anonymized' },
  { label: 'Extern', value: 'external' },
  { label: 'Entwurf', value: 'draft' },
]
const INDUSTRY_OPTIONS: { label: string; value: string }[] = MASTER_INDUSTRIES.map((ind) => ({
  label: ind.labelDe,
  value: ind.id,
}))

function toApiFilters(f: FiltersState): MatchReferenceFilters {
  const volumeBounds = rpcVolumeBoundsFromBands(f.volumeBands)
  const recencyBounds = rpcRecencyBoundsFromMonthsBackList(f.monthsBackList)
  return {
    industries: f.industries.length ? f.industries : null,
    minVolume: volumeBounds.minVolume,
    maxVolume: volumeBounds.maxVolume,
    volumeBands: f.volumeBands.length ? f.volumeBands : null,
    statuses: f.statuses.length ? f.statuses : null,
    createdAfter: recencyBounds.createdAfter,
    createdBefore: recencyBounds.createdBefore,
    monthsBackList: f.monthsBackList.length ? f.monthsBackList : null,
  }
}

function filtersActive(f: FiltersState): boolean {
  return (
    f.industries.length > 0 ||
    f.volumeBands.length > 0 ||
    f.statuses.length > 0 ||
    f.monthsBackList.length > 0
  )
}

/** Filter kommen ausschließlich aus der aktuellen Query — nichts von der vorherigen Suche. */
function filtersFromQuery(query: string): FiltersState {
  const parsed = parseSmartMatchQuery(query)
  const band =
    parsed.minVolume != null ? volumeBandFromMinVolume(parsed.minVolume) : null
  return {
    industries: parsed.industryId ? [parsed.industryId] : [],
    volumeBands: band ? [band] : [],
    statuses: [],
    monthsBackList: parsed.monthsBack != null ? [parsed.monthsBack] : [],
  }
}

function multiFilterLabel(
  emptyLabel: string,
  selectedLabels: string[]
): string {
  if (!selectedLabels.length) return emptyLabel
  if (selectedLabels.length === 1) return selectedLabels[0]!
  return `${emptyLabel} (${selectedLabels.length})`
}

function industryFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Branche',
    f.industries.map(
      (id) => MASTER_INDUSTRIES.find((i) => i.id === id)?.labelDe ?? id
    )
  )
}

function volumeFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Volumen',
    f.volumeBands.map(
      (b) => VOLUME_BAND_OPTIONS.find((o) => o.value === b)?.label ?? b
    )
  )
}

function statusFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Status',
    f.statuses.map((id) => STATUS_OPTIONS.find((s) => s.value === id)?.label ?? id)
  )
}

function recencyFilterLabel(f: FiltersState): string {
  return multiFilterLabel(
    'Aktualität',
    f.monthsBackList.map((m) => {
      if (m < 0) return `Älter als ${Math.abs(m)} Mon.`
      return `Letzte ${m} Mon.`
    })
  )
}

/** Deal-Kontext für den KI-Entwurf (Ghostwriter) — aus den DealRow-Feldern. */
function dealContextString(d: DealRow | null): string | null {
  if (!d) return null
  const parts = [
    d.title ? `Deal: ${d.title}` : null,
    d.company_name ? `Account: ${d.company_name}` : null,
    d.industry ? `Branche: ${formatIndustryDisplay(d.industry)}` : null,
    d.volume ? `Volumen: ${d.volume}` : null,
    d.requirements_text?.trim() ? `Anforderungen:\n${d.requirements_text.trim()}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join('\n\n') : null
}

function FilterMenu({
  label,
  active,
  children,
  contentClassName,
}: {
  label: string
  active: boolean
  children: ReactNode
  contentClassName?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors ' +
            (active
              ? 'border-primary/40 bg-primary/5 font-medium text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground')
          }
        >
          <span>{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('max-h-72 overflow-auto p-1.5', contentClassName ?? 'w-72')}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

function MultiSelect<T extends string | number>({
  options,
  values,
  onChange,
  truncateLabels = true,
}: {
  options: { label: string; value: T }[]
  values: T[]
  onChange: (next: T[]) => void
  truncateLabels?: boolean
}) {
  function toggle(v: T) {
    if (values.includes(v)) onChange(values.filter((x) => x !== v))
    else onChange([...values, v])
  }
  return (
    <div className="space-y-0.5">
      {options.map((o) => {
        const selected = values.includes(o.value)
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => toggle(o.value)}
            className={
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ' +
              (selected ? 'font-medium text-primary' : 'text-foreground')
            }
          >
            <span className={cn('pr-2', truncateLabels && 'truncate')}>{o.label}</span>
            {selected ? (
              <CheckIcon className="size-3.5 shrink-0 text-primary" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Hauptkomponente ---------- */

export function SmartMatchShell({
  deals,
  initialDealId,
  variant = 'page',
}: {
  deals: DealRow[]
  initialDealId: string | null
  /** `embedded`: Drawer im Deal-Cockpit — fester Deal-Kontext, kein Seiten-Titel. */
  variant?: 'page' | 'embedded'
}) {
  const router = useRouter()
  const embedded = variant === 'embedded'

  const initialDeal = deals.find((d) => d.id === initialDealId) ?? null

  const [query, setQuery] = useState(
    initialDeal ? initialDeal.requirements_text?.trim() || initialDeal.title : ''
  )
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MatchReferenceHit[] | null>(null)
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId)
  const [dealPickerOpen, setDealPickerOpen] = useState(false)
  const [dealQuery, setDealQuery] = useState('')
  const [sessionReady, setSessionReady] = useState(embedded)

  useLayoutEffect(() => {
    if (embedded) return
    const restored = readSmartMatchSession()
    if (restored) {
      setQuery(restored.query)
      setFilters(restored.filters)
      setResults(restored.results)
      if (!initialDealId) setSelectedDealId(restored.selectedDealId)
    }
    setSessionReady(true)
  }, [embedded, initialDealId])

  function persistSession(
    next: Partial<{
      query: string
      filters: FiltersState
      selectedDealId: string | null
      results: MatchReferenceHit[] | null
    }>
  ) {
    if (embedded) return
    const nextResults = next.results !== undefined ? next.results : results
    if (nextResults === null) {
      writeSmartMatchSession(null)
      return
    }
    writeSmartMatchSession({
      query: next.query ?? query,
      filters: next.filters ?? filters,
      selectedDealId:
        next.selectedDealId !== undefined ? next.selectedDealId : selectedDealId,
      results: nextResults,
    })
  }

  const selectedDeal = deals.find((d) => d.id === selectedDealId) ?? null
  const linkedIds = new Set(selectedDeal?.linked_refs?.map((r) => r.id) ?? [])
  const filteredDeals = deals.filter((d) =>
    `${d.title} ${d.company_name ?? ''}`.toLowerCase().includes(dealQuery.trim().toLowerCase())
  )

  async function runSearch(opts?: { text?: string; filters?: FiltersState; dealId?: string | null }) {
    const q = (opts?.text ?? query).trim()
    const f = opts?.filters ?? filtersFromQuery(opts?.text ?? query)
    if (opts?.filters === undefined) {
      setFilters(f)
    }
    const dealId = opts?.dealId !== undefined ? opts.dealId : selectedDealId
    setLoading(true)
    setResults(null)
    try {
      const res = await matchReferences(q, dealId ?? undefined, {
        matchCount: q ? 10 : 20,
        matchThreshold: 0.35,
        // Score-Ranking in der UI; kein GPT-Rerank.
        rerank: false,
        filters: toApiFilters(f),
      })
      if (!res.success) {
        toast.error(res.error)
        setResults([])
        persistSession({
          query: q,
          filters: f,
          selectedDealId: dealId,
          results: [],
        })
        return
      }
      setResults(res.matches)
      persistSession({
        query: q,
        filters: f,
        selectedDealId: dealId,
        results: res.matches,
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter ändern → wenn schon gesucht wurde, sofort mit den neuen Filtern neu suchen.
  function updateFilters(next: FiltersState) {
    setFilters(next)
    if (results !== null) void runSearch({ filters: next })
  }
  function selectDeal(id: string) {
    if (embedded) return
    setSelectedDealId(id)
    setDealPickerOpen(false)
    setDealQuery('')
    if (results !== null || query.trim()) void runSearch({ dealId: id })
  }
  function clearDeal() {
    if (embedded) return
    setSelectedDealId(null)
    if (results !== null) void runSearch({ dealId: null })
  }

  const hasSearched = loading || results !== null
  const showResultsPanel = sessionReady && hasSearched
  const showSuggestions = !query.trim()
  const hasDealChip = Boolean(selectedDeal || (embedded && initialDeal))
  const showMetaRow = showSuggestions || hasDealChip

  return (
    <div
      className={cn(
        embedded
          ? 'flex min-h-0 flex-1 flex-col gap-3'
          : 'flex h-full min-h-0 w-full flex-1 flex-col px-5 pt-14 pb-3 md:px-8 md:pt-7'
      )}
    >
      <div
        className={cn(
          embedded ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto flex h-full min-h-0 w-full max-w-[1000px] flex-1 flex-col'
        )}
      >
      {!embedded ? (
        <h1 className={cn(DASHBOARD_PAGE_TITLE_CLASS, 'shrink-0')}>{COPY.nav.match}</h1>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {showResultsPanel ? (
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 md:mt-4">
              {/* Filter + Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-[13px] text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterMenu
                    label={industryFilterLabel(filters)}
                    active={filters.industries.length > 0}
                    contentClassName="w-[22rem] max-w-[min(22rem,calc(100vw-2rem))]"
                  >
                    <MultiSelect
                      options={INDUSTRY_OPTIONS}
                      values={filters.industries}
                      truncateLabels={false}
                      onChange={(industries) => updateFilters({ ...filters, industries })}
                    />
                  </FilterMenu>

                  <FilterMenu
                    label={volumeFilterLabel(filters)}
                    active={filters.volumeBands.length > 0}
                  >
                    <MultiSelect
                      options={VOLUME_BAND_OPTIONS}
                      values={filters.volumeBands}
                      onChange={(volumeBands) => updateFilters({ ...filters, volumeBands })}
                    />
                  </FilterMenu>

                  <FilterMenu
                    label={statusFilterLabel(filters)}
                    active={filters.statuses.length > 0}
                  >
                    <MultiSelect
                      options={STATUS_OPTIONS}
                      values={filters.statuses}
                      onChange={(statuses) => updateFilters({ ...filters, statuses })}
                    />
                  </FilterMenu>

                  <FilterMenu
                    label={recencyFilterLabel(filters)}
                    active={filters.monthsBackList.length > 0}
                  >
                    <MultiSelect
                      options={RECENCY_OPTIONS}
                      values={filters.monthsBackList}
                      onChange={(monthsBackList) =>
                        updateFilters({ ...filters, monthsBackList })
                      }
                    />
                  </FilterMenu>

                  {filtersActive(filters) ? (
                    <button
                      type="button"
                      onClick={() => updateFilters(EMPTY_FILTERS)}
                      aria-label="Filter zurücksetzen"
                      title="Filter zurücksetzen"
                      className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                </div>
                <div>
                  {loading
                    ? 'Suche läuft …'
                    : results && results.length > 0
                      ? `${results.length} Treffer`
                      : null}
                </div>
              </div>

              {loading ? (
                <MatchResultSkeleton count={3} />
              ) : results && results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((m, i) => {
                    const next = results[i + 1]
                    const gapToNext =
                      next && m.similarity >= 0 && next.similarity >= 0
                        ? m.similarity - next.similarity
                        : null
                    return (
                    <MatchResultCard
                      key={m.id}
                      hit={m}
                      dealId={selectedDealId ?? undefined}
                      dealContext={dealContextString(selectedDeal)}
                      alreadyLinked={linkedIds.has(m.id)}
                      onLinked={() => router.refresh()}
                      rank={i + 1}
                      gapToNext={gapToNext}
                    />
                    )
                  })}
                </div>
              ) : (
                /* Ehrlicher Leerzustand statt Fake-Treffer (Proof over Promise) */
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13.5px] text-destructive">
                  ⚠ Keine passenden Referenzen für diese Anfrage gefunden.
                </div>
              )}
          </div>
        ) : (
          <div className="min-h-0 flex-1" aria-hidden />
        )}

        {/* Prompt-Bar unten — Abstand Kapseln↔Card-Rand = Abstand Kapseln↔Bar (je 0.75rem) */}
        <div className="mt-auto shrink-0 pt-3">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border border-border/80 bg-card px-2 py-1.5 shadow-sm',
                'transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40'
              )}
            >
              {!embedded ? (
                <TooltipProvider>
                  <Popover open={dealPickerOpen} onOpenChange={setDealPickerOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Deal verknüpfen"
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors',
                              'hover:bg-muted',
                              selectedDeal && 'bg-primary/10 text-primary'
                            )}
                          >
                            <Plus className="size-5" strokeWidth={1.75} />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-left">
                        Deal verknüpfen: Füge einen Deal als Kontext hinzu, um bessere Ergebnisse zu
                        erhalten.
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent align="start" side="top" className="w-72 p-1.5">
                      <input
                        value={dealQuery}
                        onChange={(e) => setDealQuery(e.target.value)}
                        placeholder="Deal suchen …"
                        className="mb-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                      <div className="max-h-60 overflow-auto">
                        {filteredDeals.length ? (
                          filteredDeals.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => selectDeal(d.id)}
                              className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-accent"
                            >
                              <span className="text-sm text-foreground">{d.title}</span>
                              {d.company_name ? (
                                <span className="text-xs text-muted-foreground">{d.company_name}</span>
                              ) : null}
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-3 text-sm text-muted-foreground">
                            {deals.length ? 'Keine Deals gefunden.' : 'Noch keine Deals angelegt.'}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipProvider>
              ) : null}

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runSearch()
                }}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="Beschreibe, was du brauchst …"
                aria-label="Suchanfrage"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => void runSearch()}
                aria-label={query.trim() ? 'Suchen' : 'Alle Referenzen anzeigen'}
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity',
                  'bg-primary text-primary-foreground shadow-sm',
                  'hover:opacity-90 disabled:opacity-60'
                )}
              >
                {loading ? (
                  <AppIcon icon={Loader} size={18} className="animate-spin" />
                ) : (
                  <ArrowUp className="size-5" strokeWidth={2.25} />
                )}
              </button>
            </div>

            {/* Meta-Zeile: Höhe weich kollabieren → Bar gleitet nach unten statt zu springen */}
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                showMetaRow ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-3 transition-opacity duration-200 ease-out',
                    showMetaRow ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <div className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
                    {selectedDeal ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <span className="max-w-[220px] truncate">Deal: {selectedDeal.title}</span>
                        {!embedded ? (
                          <button
                            type="button"
                            onClick={clearDeal}
                            aria-label="Deal-Kontext entfernen"
                            className="opacity-70 hover:opacity-100"
                          >
                            ✕
                          </button>
                        ) : null}
                      </span>
                    ) : embedded && initialDeal ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <span className="max-w-[220px] truncate">Deal: {initialDeal.title}</span>
                      </span>
                    ) : (
                      <span className="min-w-0" aria-hidden />
                    )}
                  </div>
                  <div
                    className={cn(
                      'ml-auto flex flex-wrap items-center justify-end gap-1 text-[11px] leading-none text-muted-foreground transition-opacity duration-200 ease-out',
                      showSuggestions
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0'
                    )}
                    aria-hidden={!showSuggestions}
                  >
                    <span className="pr-0.5">Vorschläge</span>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        tabIndex={showSuggestions ? 0 : -1}
                        onClick={() => {
                          setQuery(s.q)
                          void runSearch({ text: s.q })
                        }}
                        className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] leading-none text-foreground/90 transition-colors hover:bg-accent"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
      </div>
    </div>
  )
}
