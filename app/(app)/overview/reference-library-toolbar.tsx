'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CollectionColumnsMenu } from '@/components/dashboard/collection-columns-menu'
import { CollectionPrimaryAction } from '@/components/dashboard/collection-primary-action'
import { CollectionToolbar } from '@/components/dashboard/collection-toolbar'
import { collectionToolbarSlotFill } from '@/lib/dashboard/collection-toolbar-slots'
import { COPY } from '@/lib/copy'
import {
  ReferenceLayoutSwitch,
  type ReferenceLayoutMode,
} from './reference-layout-switch'
import { ReferenceMoreFiltersMenu } from './reference-more-filters-menu'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'

type ColumnKey = string

type Props = {
  referenceLayout: ReferenceLayoutMode
  onReferenceLayoutChange: (mode: ReferenceLayoutMode) => void
  searchValue: string
  onSearchChange: (value: string) => void
  canCreateReference: boolean
  canImportReference: boolean
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  volumeFilter: ReferenceVolumeFilter
  onVolumeFilterChange: (value: ReferenceVolumeFilter) => void
  industryFilter: string
  onIndustryFilterChange: (value: string) => void
  companyFilter: string
  onCompanyFilterChange: (value: string) => void
  tagsFilter: string
  onTagsFilterChange: (value: string) => void
  countryFilter: string
  onCountryFilterChange: (value: string) => void
  projectStatusFilter: string
  onProjectStatusFilterChange: (value: string) => void
  statusOptions: string[]
  statusLabels: Record<string, string>
  industryOptions: string[]
  companyOptions: string[]
  tagsOptions: string[]
  countryOptions: string[]
  projectStatusOptions: string[]
  projectStatusLabels: Record<string, string>
  columnOrder: ColumnKey[]
  visibleColumns: Record<string, boolean>
  onVisibleColumnsChange: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => void
  onResetColumns: () => void
  columnLabels: Record<string, string>
  onImportClick: () => void
  onCreateReferenceClick: () => void
}

export function ReferenceLibraryToolbar({
  referenceLayout,
  onReferenceLayoutChange,
  searchValue,
  onSearchChange,
  canCreateReference,
  canImportReference,
  favoritesOnly,
  onFavoritesOnlyChange,
  statusFilter,
  onStatusFilterChange,
  volumeFilter,
  onVolumeFilterChange,
  industryFilter,
  onIndustryFilterChange,
  companyFilter,
  onCompanyFilterChange,
  tagsFilter,
  onTagsFilterChange,
  countryFilter,
  onCountryFilterChange,
  projectStatusFilter,
  onProjectStatusFilterChange,
  statusOptions,
  statusLabels,
  industryOptions,
  companyOptions,
  tagsOptions,
  countryOptions,
  projectStatusOptions,
  projectStatusLabels,
  columnOrder,
  visibleColumns,
  onVisibleColumnsChange,
  onResetColumns,
  columnLabels,
  onImportClick,
  onCreateReferenceClick,
}: Props) {
  const slotFill = collectionToolbarSlotFill({
    collection: 'references',
    canCreateReference,
  })

  const statusSelect = (
    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
      <SelectTrigger className="w-full rounded-lg border bg-card shadow-sm data-[size=default]:h-10">
        <SelectValue placeholder={COPY.dashboard.tooltipStatus} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alle Status</SelectItem>
        {statusOptions.map((value) => (
          <SelectItem key={value} value={value}>
            {statusLabels[value] ?? value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <CollectionToolbar
        slots={{
          'collection-search': (
            <ToolbarSearchField
              variant="dashboard"
              wrapperClassName="min-w-0 w-full"
              className="bg-card"
              placeholder={COPY.dashboard.searchReferencesPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
            />
          ),
          'collection-filter-primary': statusSelect,
          'collection-filter-more': (
            <ReferenceMoreFiltersMenu
              favoritesOnly={favoritesOnly}
              onFavoritesOnlyChange={onFavoritesOnlyChange}
              volumeFilter={volumeFilter}
              onVolumeFilterChange={onVolumeFilterChange}
              industryFilter={industryFilter}
              onIndustryFilterChange={onIndustryFilterChange}
              industryOptions={industryOptions}
              companyFilter={companyFilter}
              onCompanyFilterChange={onCompanyFilterChange}
              companyOptions={companyOptions}
              tagsFilter={tagsFilter}
              onTagsFilterChange={onTagsFilterChange}
              tagsOptions={tagsOptions}
              countryFilter={countryFilter}
              onCountryFilterChange={onCountryFilterChange}
              countryOptions={countryOptions}
              projectStatusFilter={projectStatusFilter}
              onProjectStatusFilterChange={onProjectStatusFilterChange}
              projectStatusOptions={projectStatusOptions}
              projectStatusLabels={projectStatusLabels}
            />
          ),
          'collection-view': (
            <ReferenceLayoutSwitch
              value={referenceLayout}
              onChange={onReferenceLayoutChange}
            />
          ),
          'collection-primary':
            slotFill['collection-primary'] === 'empty' ? null : (
              <CollectionPrimaryAction
                label={COPY.dashboard.tooltipCreateReference}
                onCreate={onCreateReferenceClick}
                onImport={onImportClick}
                canImport={canImportReference}
              />
            ),
          'collection-columns': (
            <CollectionColumnsMenu
              columns={columnOrder.map((column) => ({
                id: column,
                label: columnLabels[column] ?? column,
                visible: Boolean(visibleColumns[column]),
              }))}
              onToggle={(id, visible) =>
                onVisibleColumnsChange((prev) => ({ ...prev, [id]: visible }))
              }
              onReset={onResetColumns}
            />
          ),
        }}
      />
    </TooltipProvider>
  )
}
