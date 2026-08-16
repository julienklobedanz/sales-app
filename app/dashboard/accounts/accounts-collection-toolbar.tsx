'use client'

import { CollectionColumnsMenu } from '@/components/dashboard/collection-columns-menu'
import { CollectionPrimaryAction } from '@/components/dashboard/collection-primary-action'
import { CollectionToolbar } from '@/components/dashboard/collection-toolbar'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { collectionToolbarSlotFill } from '@/lib/dashboard/collection-toolbar-slots'
import { COPY } from '@/lib/copy'
import type { AccountsNdaFilter } from '@/lib/accounts/account-collection-columns'
import {
  ACCOUNT_COLUMN_KEYS,
  ACCOUNT_COLUMN_LABELS,
  type AccountColumnKey,
} from '@/lib/accounts/account-collection-columns'
import {
  ReferenceLayoutSwitch,
  type ReferenceLayoutMode,
} from '@/app/dashboard/overview/reference-layout-switch'
import { AccountsMoreFiltersMenu } from './accounts-more-filters-menu'
import type { ReferencesFilter } from './accounts-grid-types'

export function AccountsCollectionToolbar({
  search,
  onSearchChange,
  ndaFilter,
  onNdaFilterChange,
  canCreateAccount,
  onCreate,
  onImport,
  importing,
  layout,
  onLayoutChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  industryFilter,
  onIndustryFilterChange,
  industryOptions,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  referencesFilter,
  onReferencesFilterChange,
  columnVisibility,
  onToggleColumn,
  onResetColumns,
}: {
  search: string
  onSearchChange: (value: string) => void
  ndaFilter: AccountsNdaFilter
  onNdaFilterChange: (value: AccountsNdaFilter) => void
  canCreateAccount: boolean
  onCreate: () => void
  onImport: () => void
  importing: boolean
  layout: ReferenceLayoutMode
  onLayoutChange: (mode: ReferenceLayoutMode) => void
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  industryFilter: string
  onIndustryFilterChange: (value: string) => void
  industryOptions: string[]
  locationFilter: string
  onLocationFilterChange: (value: string) => void
  locationOptions: string[]
  referencesFilter: ReferencesFilter
  onReferencesFilterChange: (value: ReferencesFilter) => void
  columnVisibility: Record<string, boolean>
  onToggleColumn: (id: string, visible: boolean) => void
  onResetColumns: () => void
}) {
  const slotFill = collectionToolbarSlotFill({
    collection: 'accounts',
    canCreateReference: false,
    canCreateAccount,
  })

  return (
    <CollectionToolbar
      slots={{
        'collection-search': (
          <ToolbarSearchField
            variant="list"
            type="search"
            placeholder={COPY.accounts.searchCompaniesPlaceholder}
            value={search}
            onChange={onSearchChange}
            aria-label="Firma suchen"
          />
        ),
        'collection-filter-primary': (
          <Select
            value={ndaFilter}
            onValueChange={(value) => onNdaFilterChange(value as AccountsNdaFilter)}
          >
            <SelectTrigger className="h-10 w-full bg-white" aria-label="NDA">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{COPY.accounts.filterNdaAll}</SelectItem>
              <SelectItem value="active">{COPY.accounts.filterNdaActive}</SelectItem>
              <SelectItem value="expiring">{COPY.accounts.filterNdaExpiring}</SelectItem>
              <SelectItem value="none">{COPY.accounts.filterNdaNone}</SelectItem>
            </SelectContent>
          </Select>
        ),
        'collection-filter-more': (
          <AccountsMoreFiltersMenu
            favoritesOnly={favoritesOnly}
            onFavoritesOnlyChange={onFavoritesOnlyChange}
            industryFilter={industryFilter}
            onIndustryFilterChange={onIndustryFilterChange}
            industryOptions={industryOptions}
            locationFilter={locationFilter}
            onLocationFilterChange={onLocationFilterChange}
            locationOptions={locationOptions}
            referencesFilter={referencesFilter}
            onReferencesFilterChange={onReferencesFilterChange}
          />
        ),
        'collection-view': (
          <ReferenceLayoutSwitch value={layout} onChange={onLayoutChange} />
        ),
        'collection-primary':
          slotFill['collection-primary'] === 'empty' ? null : (
            <CollectionPrimaryAction
              label={COPY.accounts.addAccount}
              onCreate={onCreate}
              onImport={onImport}
              canImport
              importing={importing}
            />
          ),
        'collection-columns': (
          <CollectionColumnsMenu
            columns={ACCOUNT_COLUMN_KEYS.map((id: AccountColumnKey) => ({
              id,
              label: ACCOUNT_COLUMN_LABELS[id],
              visible: columnVisibility[id] !== false,
            }))}
            onToggle={onToggleColumn}
            onReset={onResetColumns}
          />
        ),
      }}
    />
  )
}
