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
import { ReferenceVolumeFilterMenu } from '@/components/references/reference-volume-filter-menu'
import { COPY } from '@/lib/copy'
import { getIndustryLabelDe } from '@/lib/constants/industries'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'
import { cn } from '@/lib/utils'

type Props = {
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  volumeFilter: ReferenceVolumeFilter
  onVolumeFilterChange: (value: ReferenceVolumeFilter) => void
  industryFilter: string
  onIndustryFilterChange: (value: string) => void
  industryOptions: string[]
  companyFilter: string
  onCompanyFilterChange: (value: string) => void
  companyOptions: string[]
  tagsFilter: string
  onTagsFilterChange: (value: string) => void
  tagsOptions: string[]
  countryFilter: string
  onCountryFilterChange: (value: string) => void
  countryOptions: string[]
  projectStatusFilter: string
  onProjectStatusFilterChange: (value: string) => void
  projectStatusOptions: string[]
  projectStatusLabels: Record<string, string>
}

function referenceMoreFiltersActive(args: {
  favoritesOnly: boolean
  volumeFilter: ReferenceVolumeFilter
  industryFilter: string
  companyFilter: string
  tagsFilter: string
  countryFilter: string
  projectStatusFilter: string
}): boolean {
  return (
    args.favoritesOnly ||
    args.volumeFilter !== 'all' ||
    args.industryFilter !== 'all' ||
    args.companyFilter !== 'all' ||
    args.tagsFilter !== 'all' ||
    args.countryFilter !== 'all' ||
    args.projectStatusFilter !== 'all'
  )
}

export function ReferenceMoreFiltersMenu(props: Props) {
  const active = referenceMoreFiltersActive(props)

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
        <FilterMenuCheckboxOption
          label={COPY.dashboard.tooltipFavorites}
          selected={props.favoritesOnly}
          onSelect={() => props.onFavoritesOnlyChange(!props.favoritesOnly)}
        />
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Volumen
        </DropdownMenuLabel>
        <ReferenceVolumeFilterMenu
          value={props.volumeFilter}
          onChange={props.onVolumeFilterChange}
        />
        <DropdownMenuSeparator />
        <FilterSection
          label="Industrie"
          value={props.industryFilter}
          onChange={props.onIndustryFilterChange}
          options={props.industryOptions}
          getLabel={getIndustryLabelDe}
        />
        <DropdownMenuSeparator />
        <FilterSection
          label="Account"
          value={props.companyFilter}
          onChange={props.onCompanyFilterChange}
          options={props.companyOptions}
        />
        <DropdownMenuSeparator />
        <FilterSection
          label="Tags"
          value={props.tagsFilter}
          onChange={props.onTagsFilterChange}
          options={props.tagsOptions}
        />
        <DropdownMenuSeparator />
        <FilterSection
          label="HQ"
          value={props.countryFilter}
          onChange={props.onCountryFilterChange}
          options={props.countryOptions}
        />
        <DropdownMenuSeparator />
        <FilterSection
          label="Projektstatus"
          value={props.projectStatusFilter}
          onChange={props.onProjectStatusFilterChange}
          options={props.projectStatusOptions}
          getLabel={(value) => props.projectStatusLabels[value] ?? value}
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
