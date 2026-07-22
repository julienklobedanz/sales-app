'use client'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { AccountsToolbarTooltip } from '@/app/dashboard/accounts/components/accounts-toolbar-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FilterMenuCheckboxOption } from '@/components/table/filter-menu-checkbox-option'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { BRAND_PRIMARY_BUTTON_CLASS } from '@/lib/cognism-shell-styles'
import { cn } from '@/lib/utils'
import {
  CirclePlus,
  Filter,
  StarIcon,
  TrendingUp,
  UploadIcon,
} from '@hugeicons/core-free-icons'
import { Banknote, Eye, EyeOff } from 'lucide-react'
import { ReferenceVolumeFilterMenu } from '@/components/references/reference-volume-filter-menu'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'
import { ReferenceLayoutSwitch, type ReferenceLayoutMode } from './reference-layout-switch'
import { ReferenceProofSegmentSwitch } from '@/components/references/reference-proof-segment-switch'
import type { ReferenceLibraryMode } from './reference-library-switch'
import { REFERENCE_PROOF_SEGMENT_LABELS } from '@/lib/references/library/reference-library-mode'

/** Feste Toolbar-Slots: Moduswechsel per Conditional Render — kein sichtbares Ausblenden. */
const REFERENCE_FILTERS_SLOT_CLASS = 'relative h-10 min-w-[11.5rem] shrink-0'
const REFERENCE_TOOLS_SLOT_CLASS = 'relative h-10 min-w-[5.75rem] shrink-0'
const TOOLBAR_IMPORT_SLOT_CLASS = 'relative h-10 w-10 shrink-0'
const TOOLBAR_CTA_SLOT_CLASS = 'relative h-10 min-w-[10.5rem] shrink-0'

const TOOLBAR_ICON_CLASS = 'shrink-0 text-muted-foreground'

const PRIMARY_CTA_CLASS = cn(
  BRAND_PRIMARY_BUTTON_CLASS,
  'h-10 w-full min-w-0 justify-center gap-1.5 rounded-lg px-3'
)

type ColumnKey = string

type Props = {
  libraryMode: ReferenceLibraryMode
  onLibraryModeChange?: (mode: ReferenceLibraryMode) => void
  showProofSegmentSwitch?: boolean
  referenceLayout: ReferenceLayoutMode
  onReferenceLayoutChange: (mode: ReferenceLayoutMode) => void
  searchValue: string
  onSearchChange: (value: string) => void
  isAdmin: boolean
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  volumeFilter: ReferenceVolumeFilter
  onVolumeFilterChange: (value: ReferenceVolumeFilter) => void
  statusOptions: string[]
  statusLabels: Record<string, string>
  columnOrder: ColumnKey[]
  visibleColumns: Record<string, boolean>
  onVisibleColumnsChange: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void
  onResetVisibleColumns: () => void
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
  isAdmin,
  favoritesOnly,
  onFavoritesOnlyChange,
  statusFilter,
  onStatusFilterChange,
  volumeFilter,
  onVolumeFilterChange,
  statusOptions,
  statusLabels,
  columnOrder,
  visibleColumns,
  onVisibleColumnsChange,
  onResetVisibleColumns,
  columnLabels,
  onImportClick,
  onCreateReferenceClick,
  onUploadCertificateClick,
  onBulkUploadCertificatesClick,
  showExpiredCertificates = false,
  onShowExpiredCertificatesChange,
}: Props) {
  const isReferencesLibrary = libraryMode === 'references'

  return (
    <div className="flex min-h-10 w-full min-w-0 items-center gap-2.5 sm:gap-3">
      <ToolbarSearchField
        variant="dashboard"
        wrapperClassName="min-w-0 flex-1"
        className="bg-white"
        placeholder={
          isReferencesLibrary
            ? COPY.dashboard.searchReferencesPlaceholder
            : 'Zertifikate durchsuchen…'
        }
        value={searchValue}
        onChange={onSearchChange}
      />

      <TooltipProvider delayDuration={300}>
        <div className="flex shrink-0 flex-nowrap items-center gap-2 sm:gap-2.5">
        <div className={REFERENCE_FILTERS_SLOT_CLASS} aria-hidden={!isReferencesLibrary}>
          {isReferencesLibrary ? (
            <div key="reference-filters" className="flex h-10 items-center gap-2.5">
          <AccountsToolbarTooltip label={COPY.dashboard.tooltipFavorites}>
            <Button
              type="button"
              variant="ghost"
              size="toolbar"
              className={cn(
                'shrink-0 px-2.5 hover:bg-muted/70',
                favoritesOnly && 'bg-amber-100/70 text-foreground dark:bg-amber-950/40'
              )}
              onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
              aria-pressed={favoritesOnly}
              aria-label={COPY.dashboard.tooltipFavorites}
            >
              <AppIcon
                icon={StarIcon}
                size={16}
                className={cn(
                  'shrink-0',
                  favoritesOnly ? 'text-amber-500 dark:text-amber-400' : TOOLBAR_ICON_CLASS
                )}
              />
            </Button>
          </AccountsToolbarTooltip>

          <Popover>
            <AccountsToolbarTooltip label={COPY.dashboard.tooltipStatus}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  className={cn(
                    'shrink-0 px-2.5 hover:bg-muted/70',
                    statusFilter !== 'all' && 'bg-primary/10 text-primary'
                  )}
                  aria-label={COPY.dashboard.tooltipStatus}
                >
                  <AppIcon icon={TrendingUp} size={16} className={TOOLBAR_ICON_CLASS} />
                </Button>
              </PopoverTrigger>
            </AccountsToolbarTooltip>
            <PopoverContent align="end" className="w-56 p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="max-h-56 space-y-0 overflow-y-auto text-sm">
                {['all', ...statusOptions].map((value) => {
                  const isAll = value === 'all'
                  const label = isAll ? 'Alle' : statusLabels[value] ?? value
                  return (
                    <FilterMenuCheckboxOption
                      key={value}
                      label={label}
                      selected={statusFilter === value}
                      onSelect={() => onStatusFilterChange(value)}
                    />
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <AccountsToolbarTooltip label="Volumen filtern">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  className={cn(
                    'shrink-0 px-2.5 hover:bg-muted/70',
                    volumeFilter !== 'all' && 'bg-primary/10 text-primary'
                  )}
                  aria-label="Volumen filtern"
                >
                  <Banknote className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Button>
              </PopoverTrigger>
            </AccountsToolbarTooltip>
            <PopoverContent align="end" className="w-56 p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
              <ReferenceVolumeFilterMenu value={volumeFilter} onChange={onVolumeFilterChange} />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <AccountsToolbarTooltip label={COPY.dashboard.tooltipColumns}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  className="shrink-0 px-2.5 hover:bg-muted/70"
                  aria-label={COPY.dashboard.columnsToggleAria}
                >
                  <AppIcon icon={Filter} size={16} className={TOOLBAR_ICON_CLASS} />
                </Button>
              </DropdownMenuTrigger>
            </AccountsToolbarTooltip>
            <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)]">
              {columnOrder.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column}
                  checked={visibleColumns[column]}
                  onCheckedChange={(checked) =>
                    onVisibleColumnsChange((prev) => ({
                      ...prev,
                      [column]: Boolean(checked),
                    }))
                  }
                  onSelect={(e: Event) => e.preventDefault()}
                >
                  {columnLabels[column]}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-center text-xs text-muted-foreground"
                onSelect={(e) => {
                  e.preventDefault()
                  onResetVisibleColumns()
                }}
              >
                Zurücksetzen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {isAdmin ? (
            <div className={TOOLBAR_IMPORT_SLOT_CLASS} aria-hidden={!isReferencesLibrary && !onBulkUploadCertificatesClick}>
              {isReferencesLibrary ? (
                <AccountsToolbarTooltip label={COPY.dashboard.tooltipImport}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="toolbar"
                    className="shrink-0 px-2.5 hover:bg-muted/70"
                    onClick={onImportClick}
                    aria-label={COPY.dashboard.tooltipImport}
                  >
                    <AppIcon icon={UploadIcon} size={16} className={TOOLBAR_ICON_CLASS} />
                  </Button>
                </AccountsToolbarTooltip>
              ) : onBulkUploadCertificatesClick ? (
                <AccountsToolbarTooltip label="Zertifikate importieren">
                  <Button
                    type="button"
                    variant="ghost"
                    size="toolbar"
                    className="shrink-0 px-2.5 hover:bg-muted/70"
                    onClick={onBulkUploadCertificatesClick}
                    aria-label="Zertifikate importieren"
                  >
                    <AppIcon icon={UploadIcon} size={16} className={TOOLBAR_ICON_CLASS} />
                  </Button>
                </AccountsToolbarTooltip>
              ) : null}
            </div>
          ) : null}

          <div className={REFERENCE_TOOLS_SLOT_CLASS}>
            {isReferencesLibrary ? (
              <ReferenceLayoutSwitch value={referenceLayout} onChange={onReferenceLayoutChange} />
            ) : (
              <div key="certificate-tools" className="flex h-10 items-center gap-2.5">
              {onShowExpiredCertificatesChange ? (
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
                    className={cn(
                      'shrink-0 px-2.5 hover:bg-muted/70',
                      showExpiredCertificates && 'bg-muted/80'
                    )}
                    aria-pressed={showExpiredCertificates}
                    aria-label={
                      showExpiredCertificates
                        ? 'Abgelaufene Zertifikate ausblenden'
                        : 'Abgelaufene Zertifikate anzeigen'
                    }
                    onClick={() => onShowExpiredCertificatesChange(!showExpiredCertificates)}
                  >
                    {showExpiredCertificates ? (
                      <Eye className="size-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground" aria-hidden />
                    )}
                  </Button>
                </AccountsToolbarTooltip>
              ) : null}
              </div>
            )}
          </div>

          {showProofSegmentSwitch && onLibraryModeChange ? (
            <ReferenceProofSegmentSwitch
              value={libraryMode}
              onChange={onLibraryModeChange}
            />
          ) : null}

          {isAdmin ? (
            <div className={TOOLBAR_CTA_SLOT_CLASS}>
              {isReferencesLibrary ? (
                <Button
                  type="button"
                  size="toolbar"
                  className={PRIMARY_CTA_CLASS}
                  onClick={onCreateReferenceClick}
                >
                  <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
                  <span className="max-w-[9rem] truncate sm:max-w-none">
                    {COPY.dashboard.tooltipCreateReference}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="toolbar"
                  className={PRIMARY_CTA_CLASS}
                  onClick={onUploadCertificateClick}
                >
                  <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
                  <span className="max-w-[9rem] truncate sm:max-w-none">
                    {`${REFERENCE_PROOF_SEGMENT_LABELS.certificates} hochladen`}
                  </span>
                </Button>
              )}
            </div>
          ) : null}
        </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
