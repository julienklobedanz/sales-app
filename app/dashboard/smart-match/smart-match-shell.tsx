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
import { Search01Icon } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { COPY } from '@/lib/copy'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { MASTER_INDUSTRIES, formatIndustryDisplay } from '@/lib/constants/industries'
import { MatchResultSkeleton } from '@/components/dashboard/match-result-skeleton'
import { MatchResultCard } from '@/app/dashboard/deals/components/match-result-card'
import {
  matchReferences,
  type MatchReferenceHit,
  type MatchReferenceFilters,
} from '@/app/dashboard/actions'
import type { DealRow } from '@/app/dashboard/deals/types'

const SUGGESTIONS = [
  { label: '>2 Mio €', q: 'Projekte über 2 Mio Euro im Enterprise-Umfeld' },
  { label: 'ISO 27001', q: 'ISO 27001 Security Nachweise und Zertifikate' },
  { label: 'Managed Services', q: 'Managed Services 24/7 für Industrieunternehmen' },
]

/* ---------- Filter (Stufe C) ---------- */

type FiltersState = {
  industries: string[]
  minVolume: number | null
  statuses: string[]
  monthsBack: number | null
}
const EMPTY_FILTERS: FiltersState = { industries: [], minVolume: null, statuses: [], monthsBack: null }

/** Session-Persistenz: Browser-Zurück nach Referenz-Details behält Treffer. */
const SMART_MATCH_SESSION_KEY = 'refstack:smart-match:last-search:v2'

type SmartMatchSessionState = {
  query: string
  filters: FiltersState
  selectedDealId: string | null
  results: MatchReferenceHit[]
}

function readSmartMatchSession(): SmartMatchSessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SMART_MATCH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SmartMatchSessionState>
    if (typeof parsed.query !== 'string' || !Array.isArray(parsed.results)) return null
    return {
      query: parsed.query,
      filters: {
        industries: Array.isArray(parsed.filters?.industries) ? parsed.filters.industries : [],
        minVolume:
          typeof parsed.filters?.minVolume === 'number' ? parsed.filters.minVolume : null,
        statuses: Array.isArray(parsed.filters?.statuses) ? parsed.filters.statuses : [],
        monthsBack:
          typeof parsed.filters?.monthsBack === 'number' ? parsed.filters.monthsBack : null,
      },
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

const VOLUME_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Alle', value: null },
  { label: '≥ 1 Mio €', value: 1_000_000 },
  { label: '≥ 2 Mio €', value: 2_000_000 },
  { label: '≥ 5 Mio €', value: 5_000_000 },
  { label: '≥ 10 Mio €', value: 10_000_000 },
]
const RECENCY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Alle', value: null },
  { label: 'Letzte 12 Monate', value: 12 },
  { label: 'Letzte 24 Monate', value: 24 },
  { label: 'Letzte 36 Monate', value: 36 },
]
const STATUS_OPTIONS = [
  { id: 'approved', label: 'Freigegeben' },
  { id: 'internal_only', label: 'Intern' },
  { id: 'anonymized', label: 'Anonymisiert' },
  { id: 'external', label: 'Extern' },
  { id: 'draft', label: 'Entwurf' },
]

function toApiFilters(f: FiltersState): MatchReferenceFilters {
  let createdAfter: string | null = null
  if (f.monthsBack) {
    const d = new Date()
    d.setMonth(d.getMonth() - f.monthsBack)
    createdAfter = d.toISOString()
  }
  return {
    industries: f.industries.length ? f.industries : null,
    minVolume: f.minVolume,
    statuses: f.statuses.length ? f.statuses : null,
    createdAfter,
  }
}

function filtersActive(f: FiltersState): boolean {
  return f.industries.length > 0 || f.minVolume !== null || f.statuses.length > 0 || f.monthsBack !== null
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

function FilterMenu({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            'rounded-lg border px-2.5 py-1 transition-colors ' +
            (active
              ? 'border-primary/40 bg-primary/5 text-primary'
              : 'border-border bg-background text-foreground hover:bg-accent')
          }
        >
          {label} ▾
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-60 overflow-auto p-1.5">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function SingleSelect({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: number | null }[]
  value: number | null
  onSelect: (v: number | null) => void
}) {
  return (
    <div className="space-y-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onSelect(o.value)}
          className={
            'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ' +
            (o.value === value ? 'font-medium text-primary' : 'text-foreground')
          }
        >
          <span>{o.label}</span>
          {o.value === value ? <span>✓</span> : null}
        </button>
      ))}
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
    if (!q) return
    const f = opts?.filters ?? filters
    const dealId = opts?.dealId !== undefined ? opts.dealId : selectedDealId
    setLoading(true)
    setResults(null)
    try {
      const res = await matchReferences(q, dealId ?? undefined, {
        matchCount: 10,
        matchThreshold: 0.35,
        // Reranking: gpt-4o-mini sortiert die (gefilterten) Top-N nach echter
        // inhaltlicher Passung nach. Kleiner gefilterter Satz → billig + schnell.
        rerank: true,
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
    if (query.trim() && results !== null) void runSearch({ filters: next })
  }
  function selectDeal(id: string) {
    if (embedded) return
    setSelectedDealId(id)
    setDealPickerOpen(false)
    setDealQuery('')
    if (query.trim()) void runSearch({ dealId: id })
  }
  function clearDeal() {
    if (embedded) return
    setSelectedDealId(null)
    if (query.trim() && results !== null) void runSearch({ dealId: null })
  }
  function toggleIndustry(id: string) {
    const has = filters.industries.includes(id)
    updateFilters({
      ...filters,
      industries: has ? filters.industries.filter((x) => x !== id) : [...filters.industries, id],
    })
  }
  function toggleStatus(id: string) {
    const has = filters.statuses.includes(id)
    updateFilters({
      ...filters,
      statuses: has ? filters.statuses.filter((x) => x !== id) : [...filters.statuses, id],
    })
  }

  const hasSearched = loading || results !== null
  const showResultsPanel = sessionReady && hasSearched

  return (
    <div className={embedded ? 'space-y-3' : 'max-w-[1000px] space-y-4'}>
      {!embedded ? (
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>{COPY.nav.match}</h1>
      ) : null}

      <section className="space-y-4">
          {/* Hero-Suche */}
          <div className="rounded-xl border border-border bg-card p-[18px] shadow-sm">
            <div className="flex items-center gap-2.5 rounded-lg border border-input bg-background px-3.5 py-2.5 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <AppIcon icon={Search01Icon} size={18} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runSearch()
                }}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="Beschreibe, was du brauchst — z. B. „Cloud-Migration für Finanz, >5 Mio, SAP“"
              />
              <Button size="sm" disabled={loading || !query.trim()} onClick={() => void runSearch()}>
                {loading ? 'Suche …' : 'Finden'}
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                Kontext:
                {selectedDeal ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[13px] text-primary">
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
                ) : embedded ? null : (
                  <Popover open={dealPickerOpen} onOpenChange={setDealPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[13px] text-foreground transition-colors hover:bg-accent"
                      >
                        ⊕ Deal verknüpfen
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-1.5">
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
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                Vorschläge:
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setQuery(s.q)
                      void runSearch({ text: s.q })
                    }}
                    className="rounded-full border border-border bg-background px-2.5 py-0.5 text-foreground transition-colors hover:bg-accent"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {showResultsPanel ? (
            <div className="space-y-3">
              {/* Filter + Meta — TODO(wiring:C): Filter funktional */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-[13px] text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterMenu
                    label={filters.industries.length ? `Branche (${filters.industries.length})` : 'Branche'}
                    active={filters.industries.length > 0}
                  >
                    {MASTER_INDUSTRIES.map((ind) => (
                      <label
                        key={ind.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          checked={filters.industries.includes(ind.id)}
                          onCheckedChange={() => toggleIndustry(ind.id)}
                        />
                        <span className="truncate">{ind.labelDe}</span>
                      </label>
                    ))}
                  </FilterMenu>

                  <FilterMenu
                    label={filters.minVolume ? `≥ ${filters.minVolume / 1_000_000} Mio €` : 'Volumen'}
                    active={filters.minVolume !== null}
                  >
                    <SingleSelect
                      options={VOLUME_OPTIONS}
                      value={filters.minVolume}
                      onSelect={(v) => updateFilters({ ...filters, minVolume: v })}
                    />
                  </FilterMenu>

                  <FilterMenu
                    label={filters.statuses.length ? `Status (${filters.statuses.length})` : 'Status'}
                    active={filters.statuses.length > 0}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          checked={filters.statuses.includes(s.id)}
                          onCheckedChange={() => toggleStatus(s.id)}
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </FilterMenu>

                  <FilterMenu
                    label={filters.monthsBack ? `${filters.monthsBack} Mon.` : 'Aktualität'}
                    active={filters.monthsBack !== null}
                  >
                    <SingleSelect
                      options={RECENCY_OPTIONS}
                      value={filters.monthsBack}
                      onSelect={(v) => updateFilters({ ...filters, monthsBack: v })}
                    />
                  </FilterMenu>

                  {filtersActive(filters) ? (
                    <button
                      type="button"
                      onClick={() => updateFilters(EMPTY_FILTERS)}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Zurücksetzen
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
                  {results.map((m, i) => (
                    <MatchResultCard
                      key={m.id}
                      hit={m}
                      dealId={selectedDealId ?? undefined}
                      dealContext={dealContextString(selectedDeal)}
                      alreadyLinked={linkedIds.has(m.id)}
                      onLinked={() => router.refresh()}
                      rank={i + 1}
                      // Reihenfolge ist rerank-getrieben, nicht score-getrieben →
                      // Top-1-Aufwertung nach Score-Abstand deaktiviert.
                      gapToNext={null}
                    />
                  ))}
                </div>
              ) : (
                /* Ehrlicher Leerzustand statt Fake-Treffer (Proof over Promise) */
                <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13.5px] text-destructive">
                  <span>⚠ Keine passenden Referenzen für diese Anfrage gefunden.</span>
                  <span className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => toast.success('Referenz angefragt (folgt)')}>
                      Referenz anfragen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResults(null)
                        persistSession({ results: null })
                      }}
                    >
                      Bedarf verfeinern
                    </Button>
                  </span>
                </div>
              )}
            </div>
          ) : null}
      </section>
    </div>
  )
}
