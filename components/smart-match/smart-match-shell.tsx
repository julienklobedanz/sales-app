'use client'

/**
 * Smart-Match — Layout aus dem Wireframe
 * `refstack-vault/03_Design-UX/finden-page-wireframe.html`, auf App-Tokens/Primitives.
 *
 * Stufe A: Smart Search ist live an `matchReferences` gebunden; Treffer werden über
 * die bestehende, voll verdrahtete `MatchResultCard` gerendert (PDF/Share/→Deal/KI-Entwurf).
 * Offen (mit `TODO(wiring:*)` markiert): Deal-Kontext-Picker (B), Filter (C).
 */

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { COPY } from '@/lib/copy'
import { matchReferences } from '@/app/dashboard/actions'
import type { MatchReferenceHit } from '@/lib/match/match-types'
import type { DealRow } from '@/app/dashboard/deals/types'
import { cn } from '@/lib/utils'
import { parseSmartMatchQuery } from '@/lib/match/parse-smart-match-query'
import { parseSmartMatchFiltersAction } from '@/app/dashboard/deals/parse-smart-match-filters-action'
import { SmartMatchFiltersPanel } from '@/components/smart-match/smart-match-filters'
import { SmartMatchResults } from '@/components/smart-match/smart-match-results'
import { SmartMatchSearchBar } from '@/components/smart-match/smart-match-search'
import {
  type FiltersState,
  EMPTY_FILTERS,
  readSmartMatchSession,
  writeSmartMatchSession,
  toApiFilters,
  filtersFromParsed,
  mergeDealPrefills,
  constraintChips,
} from '@/components/smart-match/smart-match-shell-helpers'

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
    initialDeal ? initialDeal.requirements_text?.trim() || initialDeal.title : '',
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
    }>,
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
  const filteredDeals = deals.filter((d) => {
    const matchesQuery = `${d.title} ${d.company_name ?? ''}`
      .toLowerCase()
      .includes(dealQuery.trim().toLowerCase())
    if (!matchesQuery) return false
    if (filters.excludeYears.length > 0) {
      const year = new Date(d.created_at).getUTCFullYear()
      if (filters.excludeYears.includes(year)) return false
    }
    return true
  })

  async function runSearch(opts?: {
    text?: string
    filters?: FiltersState
    dealId?: string | null
  }) {
    const q = (opts?.text ?? query).trim()
    const dealId = opts?.dealId !== undefined ? opts.dealId : selectedDealId
    const dealForPrefill =
      dealId != null ? (deals.find((d) => d.id === dealId) ?? null) : null

    let f: FiltersState
    if (opts?.filters !== undefined) {
      f = opts.filters
    } else {
      // Natürliche Sprache → Filter (Heuristik + optional LLM), dann Deal-Prefills.
      const parsed = q ? await parseSmartMatchFiltersAction(q) : parseSmartMatchQuery('')
      f = mergeDealPrefills(filtersFromParsed(parsed), dealForPrefill)
      setFilters(f)
    }

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

  // Filter ändern → wenn schon gesucht wurde, unmittelbar mit den neuen Filtern neu suchen.
  function updateFilters(next: FiltersState) {
    setFilters(next)
    if (results !== null) void runSearch({ filters: next })
  }
  function selectDeal(id: string) {
    if (embedded) return
    setSelectedDealId(id)
    setDealPickerOpen(false)
    setDealQuery('')
    const deal = deals.find((d) => d.id === id) ?? null
    const nextFilters = mergeDealPrefills(filters, deal)
    setFilters(nextFilters)
    if (results !== null || query.trim())
      void runSearch({ dealId: id, filters: nextFilters })
  }
  function clearDeal() {
    if (embedded) return
    setSelectedDealId(null)
    if (results !== null) void runSearch({ dealId: null })
  }

  const activeChips = constraintChips(filters)
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
          : 'flex h-full min-h-0 w-full flex-1 flex-col px-5 pt-14 pb-3 md:px-8 md:pt-7',
      )}
    >
      <div
        className={cn(
          embedded
            ? 'flex min-h-0 flex-1 flex-col'
            : 'mx-auto flex h-full min-h-0 w-full max-w-[1000px] flex-1 flex-col',
        )}
      >
        {!embedded ? (
          <h1 className={cn(DASHBOARD_PAGE_TITLE_CLASS, 'shrink-0')}>{COPY.nav.match}</h1>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          {showResultsPanel ? (
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 md:mt-4">
              <SmartMatchFiltersPanel
                filters={filters}
                activeChips={activeChips}
                loading={loading}
                results={results}
                onUpdateFilters={updateFilters}
              />

              <SmartMatchResults
                loading={loading}
                results={results}
                selectedDealId={selectedDealId}
                selectedDeal={selectedDeal}
                linkedIds={linkedIds}
                onLinked={() => router.refresh()}
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1" aria-hidden />
          )}

          <SmartMatchSearchBar
            embedded={embedded}
            query={query}
            onQueryChange={setQuery}
            loading={loading}
            onSearch={(opts) => void runSearch(opts)}
            dealPickerOpen={dealPickerOpen}
            onDealPickerOpenChange={setDealPickerOpen}
            dealQuery={dealQuery}
            onDealQueryChange={setDealQuery}
            filteredDeals={filteredDeals}
            deals={deals}
            selectedDeal={selectedDeal}
            onSelectDeal={selectDeal}
            onClearDeal={clearDeal}
            initialDeal={initialDeal}
            showMetaRow={showMetaRow}
            showSuggestions={showSuggestions}
          />
        </div>
      </div>
    </div>
  )
}
