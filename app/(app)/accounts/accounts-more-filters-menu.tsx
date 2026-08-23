'use client'

import { FilterMenuCheckboxOption } from '@/components/table/filter-menu-checkbox-option'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COPY } from '@/lib/copy'
import { getIndustryLabelDe } from '@/lib/constants/industries'
import { cn } from '@/lib/utils'

function accountsMoreFiltersActive(args: {
  industryFilter: string
  locationFilter: string
  referencesFilter: 'any' | 'with' | 'without'
}): boolean {
  return (
    args.industryFilter !== 'all' ||
    args.locationFilter !== 'all' ||
    args.referencesFilter !== 'any'
  )
}

export function AccountsMoreFiltersMenu(props: {
  industryFilter: string
  onIndustryFilterChange: (value: string) => void
  industryOptions: string[]
  locationFilter: string
  onLocationFilterChange: (value: string) => void
  locationOptions: string[]
  referencesFilter: 'any' | 'with' | 'without'
  onReferencesFilterChange: (value: 'any' | 'with' | 'without') => void
}) {
  const active = accountsMoreFiltersActive(props)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="toolbar"
          className={cn('w-full bg-card', active && 'border-primary/40 text-primary')}
        >
          {COPY.dashboard.moreFilters}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(100vw-2rem,18rem)] p-1">
        <FilterSection
          label="Branche"
          value={props.industryFilter}
          onChange={props.onIndustryFilterChange}
          options={props.industryOptions}
          getLabel={getIndustryLabelDe}
        />
        <DropdownMenuSeparator />
        <FilterSection
          label={COPY.accounts.filterLocation}
          value={props.locationFilter}
          onChange={props.onLocationFilterChange}
          options={props.locationOptions}
        />
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Referenzen
        </DropdownMenuLabel>
        <FilterMenuCheckboxOption
          label="Alle"
          selected={props.referencesFilter === 'any'}
          onSelect={() => props.onReferencesFilterChange('any')}
        />
        <FilterMenuCheckboxOption
          label="Mit Referenzen"
          selected={props.referencesFilter === 'with'}
          onSelect={() => props.onReferencesFilterChange('with')}
        />
        <FilterMenuCheckboxOption
          label="Ohne Referenzen"
          selected={props.referencesFilter === 'without'}
          onSelect={() => props.onReferencesFilterChange('without')}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterSection({
  label,
  value,
  onChange,
  options,
  getLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  getLabel?: (value: string) => string
}) {
  return (
    <div>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
      <div className="max-h-40 overflow-y-auto">
        <FilterMenuCheckboxOption
          label="Alle"
          selected={value === 'all'}
          onSelect={() => onChange('all')}
        />
        {options.map((option) => (
          <FilterMenuCheckboxOption
            key={option}
            label={getLabel ? getLabel(option) : option}
            selected={value === option}
            onSelect={() => onChange(option)}
          />
        ))}
      </div>
    </div>
  )
}
