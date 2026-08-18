'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { AccountsToolbarTooltip } from '@/app/dashboard/accounts/components/accounts-toolbar-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CollectionColumnsMenu } from '@/components/dashboard/collection-columns-menu'
import { CollectionPrimaryAction } from '@/components/dashboard/collection-primary-action'
import { CollectionToolbar } from '@/components/dashboard/collection-toolbar'
import { collectionToolbarSlotFill } from '@/lib/dashboard/collection-toolbar-slots'
import { COPY } from '@/lib/copy'
import { Eye, EyeOff } from 'lucide-react'
import {
  ReferenceLayoutSwitch,
  type ReferenceLayoutMode,
} from './reference-layout-switch'
import { ReferenceMoreFiltersMenu } from './reference-more-filters-menu'
import { ReferenceProofSegmentSwitch } from '@/components/references/reference-proof-segment-switch'
import type { ReferenceLibraryMode } from './reference-library-switch'
import { REFERENCE_PROOF_SEGMENT_LABELS } from '@/lib/references/library/reference-library-mode'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'

type ColumnKey = string

type Props = {
  libraryMode: ReferenceLibraryMode
  onLibraryModeChange?: (mode: ReferenceLibraryMode) => void
  showProofSegmentSwitch?: boolean
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
  onUploadCertificateClick: () => void
  onBulkUploadCertificatesClick?: () => void
  showExpiredCertificates?: boolean
  onShowExpiredCertificatesChange?: (value: boolean) => void
}

export function ReferenceLibraryToolbar({
  libraryMode,
  onLibraryModeChange,
  showProofSegmentSwitch = false,
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
  onUploadCertificateClick,
  onBulkUploadCertificatesClick,
  showExpiredCertificates = false,
  onShowExpiredCertificatesChange,
}: Props) {
  const isReferencesLibrary = libraryMode === 'references'
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
              placeholder={
                isReferencesLibrary
                  ? COPY.dashboard.searchReferencesPlaceholder
                  : 'Zertifikate durchsuchen…'
              }
              value={searchValue}
              onChange={onSearchChange}
            />
          ),
          'collection-filter-primary': isReferencesLibrary ? statusSelect : null,
          'collection-filter-more': isReferencesLibrary ? (
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
          ) : onShowExpiredCertificatesChange ? (
            <AccountsToolbarTooltip
              label={
                showExpiredCertificates
                  ? 'Abgelaufene Zertifikate ausblenden'
                  : 'Abgelaufene Zertifikate anzeigen'
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="toolbar"
                className="w-full"
                aria-pressed={showExpiredCertificates}
                onClick={() =>
                  onShowExpiredCertificatesChange(!showExpiredCertificates)
                }
              >
                {showExpiredCertificates ? (
                  <Eye className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <EyeOff className="size-4 text-muted-foreground" aria-hidden />
                )}
              </Button>
            </AccountsToolbarTooltip>
          ) : null,
          'collection-view': isReferencesLibrary ? (
            <ReferenceLayoutSwitch
              value={referenceLayout}
              onChange={onReferenceLayoutChange}
            />
          ) : null,
          'collection-primary': isReferencesLibrary
            ? slotFill['collection-primary'] === 'empty'
              ? null
              : (
                  <CollectionPrimaryAction
                    label={COPY.dashboard.tooltipCreateReference}
                    onCreate={onCreateReferenceClick}
                    onImport={onImportClick}
                    canImport={canImportReference}
                  />
                )
            : canImportReference
              ? (
                  <CollectionPrimaryAction
                    label={`${REFERENCE_PROOF_SEGMENT_LABELS.certificates} hochladen`}
                    onCreate={onUploadCertificateClick}
                    onImport={onBulkUploadCertificatesClick}
                    canImport={Boolean(onBulkUploadCertificatesClick)}
                  />
                )
              : null,
          'collection-columns': isReferencesLibrary ? (
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
          ) : null,
        }}
        trailing={
          showProofSegmentSwitch && onLibraryModeChange ? (
            <ReferenceProofSegmentSwitch
              value={libraryMode}
              onChange={onLibraryModeChange}
            />
          ) : null
        }
      />
    </TooltipProvider>
  )
}
