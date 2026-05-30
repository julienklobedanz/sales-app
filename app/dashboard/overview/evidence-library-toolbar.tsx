'use client'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { cn } from '@/lib/utils'
import { FileText } from '@hugeicons/core-free-icons'
import {
  CirclePlus,
  Filter,
  StarIcon,
  TrendingUp,
  UploadIcon,
} from '@hugeicons/core-free-icons'
import { Eye, EyeOff, Lock } from 'lucide-react'

import { ReferenceLayoutSwitch, type ReferenceLayoutMode } from './reference-layout-switch'
import type { EvidenceLibraryMode } from './reference-library-switch'

/** Entfernt Elemente aus dem Flex-Layout (Zertifikatsmodus), ohne die rechte Button-Gruppe zu verschieben. */
const SLOT_COLLAPSED = 'pointer-events-none m-0 w-0 min-w-0 max-w-0 overflow-hidden border-0 p-0 opacity-0'

const TOOLBAR_ICON_CLASS = 'shrink-0 text-muted-foreground'

const PRIMARY_CTA_CLASS =
  'h-10 min-w-[12.5rem] shrink-0 justify-center gap-1.5 rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 px-3 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95'

function EvidenceLibraryModeSwitch({
  value,
  onChange,
}: {
  value: EvidenceLibraryMode
  onChange: (value: EvidenceLibraryMode) => void
}) {
  const isCertificates = value === 'certificates'
  const label = isCertificates ? 'Zertifikatsdatenbank' : 'Referenzen-Datenbank'

  return (
    <AccountsToolbarTooltip label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={isCertificates}
        aria-label={
          isCertificates
            ? 'Zur Referenzen-Datenbank wechseln'
            : 'Zur Zertifikatsdatenbank wechseln'
        }
        onClick={() => onChange(isCertificates ? 'references' : 'certificates')}
        className="relative inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted/50 p-0.5 transition-colors hover:bg-muted/70"
      >
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-200 ease-out',
            isCertificates ? 'translate-x-[1.125rem]' : 'translate-x-0'
          )}
        >
          {isCertificates ? (
            <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          ) : (
            <AppIcon icon={FileText} size={14} className={TOOLBAR_ICON_CLASS} />
          )}
        </span>
      </button>
    </AccountsToolbarTooltip>
  )
}

type ColumnKey = string

type Props = {
  libraryMode: EvidenceLibraryMode
  onLibraryModeChange: (mode: EvidenceLibraryMode) => void
  referenceLayout: ReferenceLayoutMode
  onReferenceLayoutChange: (mode: ReferenceLayoutMode) => void
  searchValue: string
  onSearchChange: (value: string) => void
  isAdmin: boolean
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  statusOptions: string[]
  statusLabels: Record<string, string>
  columnOrder: ColumnKey[]
  visibleColumns: Record<string, boolean>
  onVisibleColumnsChange: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void
  columnLabels: Record<string, string>
  onImportClick: () => void
  onCreateReferenceClick: () => void
  onUploadCertificateClick: () => void
  showExpiredCertificates?: boolean
  onShowExpiredCertificatesChange?: (value: boolean) => void
}

export function EvidenceLibraryToolbar({
  libraryMode,
  onLibraryModeChange,
  referenceLayout,
  onReferenceLayoutChange,
  searchValue,
  onSearchChange,
  isAdmin,
  favoritesOnly,
  onFavoritesOnlyChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  statusLabels,
  columnOrder,
  visibleColumns,
  onVisibleColumnsChange,
  columnLabels,
  onImportClick,
  onCreateReferenceClick,
  onUploadCertificateClick,
  showExpiredCertificates = false,
  onShowExpiredCertificatesChange,
}: Props) {
  const isReferencesLibrary = libraryMode === 'references'

  return (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2.5 sm:gap-3.5 min-h-10">
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
        <div
          className={cn(
            'flex shrink-0 items-center gap-2.5',
            !isReferencesLibrary && SLOT_COLLAPSED
          )}
          aria-hidden={!isReferencesLibrary}
        >
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
              tabIndex={isReferencesLibrary ? 0 : -1}
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
                  tabIndex={isReferencesLibrary ? 0 : -1}
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

          <DropdownMenu>
            <AccountsToolbarTooltip label={COPY.dashboard.tooltipColumns}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  className="shrink-0 px-2.5 hover:bg-muted/70"
                  aria-label={COPY.dashboard.columnsToggleAria}
                  tabIndex={isReferencesLibrary ? 0 : -1}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2.5">
          {isAdmin ? (
            <div
              className={cn(!isReferencesLibrary && SLOT_COLLAPSED)}
              aria-hidden={!isReferencesLibrary}
            >
              <AccountsToolbarTooltip label={COPY.dashboard.tooltipImport}>
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  className="shrink-0 px-2.5 hover:bg-muted/70"
                  onClick={onImportClick}
                  aria-label={COPY.dashboard.tooltipImport}
                  tabIndex={isReferencesLibrary ? 0 : -1}
                >
                  <AppIcon icon={UploadIcon} size={16} className={TOOLBAR_ICON_CLASS} />
                </Button>
              </AccountsToolbarTooltip>
            </div>
          ) : null}

          <div
            className={cn(!isReferencesLibrary && SLOT_COLLAPSED)}
            aria-hidden={!isReferencesLibrary}
          >
            <ReferenceLayoutSwitch value={referenceLayout} onChange={onReferenceLayoutChange} />
          </div>

          <div
            className={cn(isReferencesLibrary && SLOT_COLLAPSED)}
            aria-hidden={isReferencesLibrary}
          >
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

          <EvidenceLibraryModeSwitch value={libraryMode} onChange={onLibraryModeChange} />

          {isAdmin ? (
            <Button
              type="button"
              size="toolbar"
              className={PRIMARY_CTA_CLASS}
              onClick={
                isReferencesLibrary ? onCreateReferenceClick : onUploadCertificateClick
              }
            >
              <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
              {isReferencesLibrary
                ? COPY.dashboard.tooltipCreateReference
                : 'Zertifikat hochladen'}
            </Button>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  )
}
