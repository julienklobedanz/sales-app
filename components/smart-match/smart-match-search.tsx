'use client'

import Link from 'next/link'
import { ArrowUp, Plus } from 'lucide-react'
import { Loader } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CompanyLogo } from '@/components/ui/company-logo'
import type { DealRow } from '@/app/dashboard/deals/types'
import { cn } from '@/lib/utils'
import { SUGGESTIONS } from '@/components/smart-match/smart-match-shell-helpers'

export function SmartMatchSearchBar({
  embedded,
  query,
  onQueryChange,
  loading,
  onSearch,
  dealPickerOpen,
  onDealPickerOpenChange,
  dealQuery,
  onDealQueryChange,
  filteredDeals,
  deals,
  selectedDeal,
  onSelectDeal,
  onClearDeal,
  initialDeal,
  showMetaRow,
  showSuggestions,
}: {
  embedded: boolean
  query: string
  onQueryChange: (value: string) => void
  loading: boolean
  onSearch: (opts?: { text?: string }) => void
  dealPickerOpen: boolean
  onDealPickerOpenChange: (open: boolean) => void
  dealQuery: string
  onDealQueryChange: (value: string) => void
  filteredDeals: DealRow[]
  deals: DealRow[]
  selectedDeal: DealRow | null
  onSelectDeal: (id: string) => void
  onClearDeal: () => void
  initialDeal: DealRow | null
  showMetaRow: boolean
  showSuggestions: boolean
}) {
  return (
    /* Prompt-Bar unten — Abstand Kapseln↔Card-Rand = Abstand Kapseln↔Bar (je 0.75rem) */
    <div className="mt-auto shrink-0 pt-3">
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border border-border/80 bg-card px-2 py-1.5 shadow-sm',
          'transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40',
        )}
      >
        {!embedded ? (
          <TooltipProvider>
            <Popover open={dealPickerOpen} onOpenChange={onDealPickerOpenChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Deal verknüpfen"
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors',
                        'hover:bg-muted',
                        selectedDeal && 'bg-primary/10 text-primary',
                      )}
                    >
                      <Plus className="size-5" strokeWidth={1.75} />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-left">
                  Deal verknüpfen: Füge einen Deal als Kontext hinzu, um bessere
                  Ergebnisse zu erhalten.
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="start" side="top" className="w-72 p-1.5">
                <input
                  value={dealQuery}
                  onChange={(e) => onDealQueryChange(e.target.value)}
                  placeholder="Deal suchen …"
                  className="mb-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <div className="max-h-60 overflow-auto">
                  {filteredDeals.length ? (
                    filteredDeals.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onSelectDeal(d.id)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                      >
                        <CompanyLogo
                          src={d.company_logo_url}
                          companyId={d.company_id}
                          fallbackText={d.company_name ?? d.title}
                          containerClassName="size-7 shrink-0 rounded-md"
                          fallbackIconSize={14}
                        />
                        <span className="min-w-0 truncate text-sm text-foreground">
                          {d.title}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      {deals.length
                        ? 'Keine Deals gefunden.'
                        : 'Noch keine Deals angelegt.'}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </TooltipProvider>
        ) : null}

        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onSearch()
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
          placeholder="Beschreibe, was du brauchst …"
          aria-label="Suchanfrage"
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => void onSearch()}
          aria-label={query.trim() ? 'Suchen' : 'Alle Referenzen anzeigen'}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity',
            'bg-primary text-primary-foreground shadow-sm',
            'hover:opacity-90 disabled:opacity-60',
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
          showMetaRow ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-3 transition-opacity duration-200 ease-out',
              showMetaRow ? 'opacity-100' : 'opacity-0',
            )}
          >
            <div className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
              {selectedDeal ? (
                <span className="inline-flex max-w-[280px] items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-1 pr-1.5 text-xs text-primary">
                  <Link
                    href={ROUTES.deals.detail(selectedDeal.id)}
                    className="inline-flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0 pr-0.5 hover:underline"
                  >
                    <CompanyLogo
                      src={selectedDeal.company_logo_url}
                      companyId={selectedDeal.company_id}
                      fallbackText={selectedDeal.company_name ?? selectedDeal.title}
                      containerClassName="size-5 shrink-0 rounded-full"
                      fallbackIconSize={10}
                    />
                    <span className="min-w-0 truncate">{selectedDeal.title}</span>
                  </Link>
                  {!embedded ? (
                    <button
                      type="button"
                      onClick={onClearDeal}
                      aria-label="Deal-Kontext entfernen"
                      className="shrink-0 rounded-full p-0.5 opacity-70 hover:bg-primary/10 hover:opacity-100"
                    >
                      ✕
                    </button>
                  ) : null}
                </span>
              ) : embedded && initialDeal ? (
                <Link
                  href={ROUTES.deals.detail(initialDeal.id)}
                  className="inline-flex max-w-[280px] items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-1 pr-2 text-xs text-primary hover:underline"
                >
                  <CompanyLogo
                    src={initialDeal.company_logo_url}
                    companyId={initialDeal.company_id}
                    fallbackText={initialDeal.company_name ?? initialDeal.title}
                    containerClassName="size-5 shrink-0 rounded-full"
                    fallbackIconSize={10}
                  />
                  <span className="min-w-0 truncate">{initialDeal.title}</span>
                </Link>
              ) : (
                <span className="min-w-0" aria-hidden />
              )}
            </div>
            <div
              className={cn(
                'ml-auto flex flex-wrap items-center justify-end gap-1 text-[11px] leading-none text-muted-foreground transition-opacity duration-200 ease-out',
                showSuggestions ? 'opacity-100' : 'pointer-events-none opacity-0',
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
                    onQueryChange(s.q)
                    void onSearch({ text: s.q })
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
  )
}
