'use client'

/**
 * Smart-Match — Layout aus dem Wireframe
 * `refstack-vault/03_Design-UX/finden-page-wireframe.html`, auf App-Tokens/Primitives.
 *
 * Stufe A: Smart Search ist live an `matchReferences` gebunden; Treffer werden über
 * die bestehende, voll verdrahtete `MatchResultCard` gerendert (PDF/Share/→Deal/KI-Entwurf).
 * Offen (mit `TODO(wiring:*)` markiert): Deal-Kontext-Picker (B), Filter (C), RFP-Upload (D).
 */

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search01Icon } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
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

type Mode = 'smart' | 'rfp'

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

/* ---------- lokaler Segmented-Control (token-basiert) ---------- */

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <span className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            'rounded-md px-3 py-1 text-sm transition-colors ' +
            (value === o.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {o.label}
        </button>
      ))}
    </span>
  )
}

/* ---------- Hauptkomponente ---------- */

export function SmartMatchShell({
  deals,
  initialDealId,
}: {
  deals: DealRow[]
  initialDealId: string | null
}) {
  const router = useRouter()

  const initialDeal = deals.find((d) => d.id === initialDealId) ?? null

  const [mode, setMode] = useState<Mode>('smart')
  const [query, setQuery] = useState(
    initialDeal ? initialDeal.requirements_text?.trim() || initialDeal.title : ''
  )
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MatchReferenceHit[] | null>(null)
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId)
  const [dealPickerOpen, setDealPickerOpen] = useState(false)
  const [dealQuery, setDealQuery] = useState('')

  const selectedDeal = deals.find((d) => d.id === selectedDealId) ?? null
  const linkedIds = new Set(selectedDeal?.linked_refs?.map((r) => r.id) ?? [])
  const filteredDeals = deals.filter((d) =>
    `${d.title} ${d.company_name ?? ''}`.toLowerCase().includes(dealQuery.trim().toLowerCase())
  )

  // RFP (Stufe D — noch Hülle)
  const [rfpStep, setRfpStep] = useState<'upload' | 'loading' | 'result'>('upload')

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
        return
      }
      setResults(res.matches)
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
    setSelectedDealId(id)
    setDealPickerOpen(false)
    setDealQuery('')
    if (query.trim()) void runSearch({ dealId: id })
  }
  function clearDeal() {
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

  function analyzeRfp() {
    setRfpStep('loading')
    window.setTimeout(() => setRfpStep('result'), 900)
  }

  const hasSearched = loading || results !== null

  return (
    <div className="max-w-[1000px] space-y-4">
      {/* Titel + Modus */}
      <div className="flex items-center justify-between gap-3">
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Smart Match</h1>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: 'smart', label: 'Smart Search' },
            { value: 'rfp', label: 'RFP' },
          ]}
        />
      </div>

      {mode === 'smart' ? (
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
                    <button
                      type="button"
                      onClick={clearDeal}
                      aria-label="Deal-Kontext entfernen"
                      className="opacity-70 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
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

          {/* Leerzustand */}
          {!hasSearched ? (
            <div className="rounded-xl border border-border bg-card px-2.5 py-[34px] text-center shadow-sm">
              <div className="mb-1 text-[15px] font-semibold text-foreground">
                Beschreibe, was du brauchst — finde den passenden Beweis
              </div>
              <div className="text-muted-foreground">
                z. B. „Cloud-Migration für Pharma, &gt;1 Mio, AWS" · oder verknüpfe einen Deal für
                vorbefüllten Kontext.
              </div>
            </div>
          ) : (
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
                    <Button variant="outline" size="sm" onClick={() => setResults(null)}>
                      Bedarf verfeinern
                    </Button>
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        /* ===================== RFP (Stufe D — noch Hülle) ===================== */
        <section>
          {rfpStep === 'upload' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="rounded-xl border border-dashed border-input bg-muted/30 p-[30px] text-center text-muted-foreground">
                <span className="mb-2 block text-[26px]">⬆</span>
                Ausschreibung hier ablegen (PDF/DOCX)
                <div className="mt-4">
                  <Button size="sm" onClick={analyzeRfp}>
                    Datei wählen &amp; analysieren
                  </Button>
                </div>
              </div>
            </div>
          ) : rfpStep === 'loading' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="h-[11px] w-[40%] animate-pulse rounded bg-muted" />
              <div className="mt-3 h-[11px] w-[90%] animate-pulse rounded bg-muted" />
              <div className="mt-2 h-[11px] w-[85%] animate-pulse rounded bg-muted" />
              <div className="mt-3 text-[13px] text-muted-foreground">
                Anforderungen werden extrahiert und gegen die Beweis-Datenbank gematcht …
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <strong className="text-foreground">Abdeckung: 7 / 9 Anforderungen</strong>
                  <span className="block h-2.5 w-[220px] overflow-hidden rounded-md bg-muted">
                    <span className="block h-full w-[78%] bg-primary" />
                  </span>
                  <span className="font-semibold text-primary">78%</span>
                </div>
                <Button size="sm" onClick={() => toast.success('Export (folgt)')}>
                  Export
                </Button>
              </div>
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    {['Anforderung', 'Bester Beweis', 'Coverage'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { req: 'Cloud-Migration', ref: 'FinanzCorp', sc: 94, dots: 4 },
                    { req: 'SAP-Umfeld', ref: 'IndustrieAG', sc: 88, dots: 3 },
                    { req: '24/7 Managed Services', ref: 'MetroBank', sc: 81, dots: 3 },
                    { req: 'ISO 27001 / Security ⚠', ref: '— (Lücke)', sc: null, dots: 0 },
                    { req: 'BSI-Grundschutz ⚠', ref: '— (Lücke)', sc: null, dots: 0 },
                  ].map((row) => (
                    <tr
                      key={row.req}
                      className={
                        'border-t border-border ' +
                        (row.sc === null ? 'text-destructive' : 'text-foreground')
                      }
                    >
                      <td className="py-2.5">{row.req}</td>
                      <td className="py-2.5">{row.ref}</td>
                      <td className="py-2.5">
                        {row.sc !== null ? (
                          <span className="font-bold text-primary">{row.sc}%</span>
                        ) : (
                          '—'
                        )}
                        &nbsp;
                        <span className="text-[11px] tracking-widest">
                          {[0, 1, 2, 3].map((d) => (
                            <span
                              key={d}
                              className={d < row.dots ? 'text-primary' : 'text-muted-foreground/40'}
                            >
                              ●
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13.5px] text-destructive">
                <span>⚠ 2 Lücken ohne Beweis</span>
                <Button variant="outline" size="sm" onClick={() => toast.success('Referenzen angefragt (folgt)')}>
                  Referenzen anfragen
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
