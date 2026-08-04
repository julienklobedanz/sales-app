'use client'

import { type ReactNode } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'

import { CheckIcon } from '@/components/ui/check-icon'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { MatchReferenceHit } from '@/lib/match/match-types'
import { VOLUME_BAND_OPTIONS } from '@/lib/match/smart-match-multi-filters'
import { cn } from '@/lib/utils'
import {
  type FiltersState,
  type ConstraintChip,
  EMPTY_FILTERS,
  RECENCY_OPTIONS,
  STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  filtersActive,
  industryFilterLabel,
  volumeFilterLabel,
  statusFilterLabel,
  recencyFilterLabel,
} from '@/app/dashboard/smart-match/smart-match-shell-helpers'

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

/* ---------- Filter (Stufe C) ---------- */

export function SmartMatchFiltersPanel({
  filters,
  activeChips,
  loading,
  results,
  onUpdateFilters,
}: {
  filters: FiltersState
  activeChips: ConstraintChip[]
  loading: boolean
  results: MatchReferenceHit[] | null
  onUpdateFilters: (next: FiltersState) => void
}) {
  return (
    <>
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
              onChange={(industries) => onUpdateFilters({ ...filters, industries })}
            />
          </FilterMenu>

          <FilterMenu
            label={volumeFilterLabel(filters)}
            active={filters.volumeBands.length > 0}
          >
            <MultiSelect
              options={VOLUME_BAND_OPTIONS}
              values={filters.volumeBands}
              onChange={(volumeBands) => onUpdateFilters({ ...filters, volumeBands })}
            />
          </FilterMenu>

          <FilterMenu
            label={statusFilterLabel(filters)}
            active={filters.statuses.length > 0}
          >
            <MultiSelect
              options={STATUS_OPTIONS}
              values={filters.statuses}
              onChange={(statuses) => onUpdateFilters({ ...filters, statuses })}
            />
          </FilterMenu>

          <FilterMenu
            label={recencyFilterLabel(filters)}
            active={filters.monthsBackList.length > 0 || filters.excludeYears.length > 0}
          >
            <MultiSelect
              options={RECENCY_OPTIONS}
              values={filters.monthsBackList}
              onChange={(monthsBackList) =>
                onUpdateFilters({ ...filters, monthsBackList })
              }
            />
          </FilterMenu>

          {filtersActive(filters) ? (
            <button
              type="button"
              onClick={() => onUpdateFilters(EMPTY_FILTERS)}
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

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onUpdateFilters(chip.clear(filters))}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[12px] text-foreground transition-colors hover:bg-accent"
              title="Constraint entfernen"
            >
              <span>{chip.label}</span>
              <span className="text-muted-foreground" aria-hidden>
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
