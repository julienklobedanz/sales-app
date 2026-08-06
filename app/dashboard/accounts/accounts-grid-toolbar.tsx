'use client'

import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, Loader, Plus, StarIcon, UploadIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { MASTER_INDUSTRIES } from '@/lib/constants/industries'
import { COPY } from '@/lib/copy'
import type { AccountEntityKind } from '@/lib/accounts/account-entity'
import type { AccountsListView } from '@/lib/accounts/accounts-list-view'
import { CreateAccountDialog } from './create-account-dialog'
import { CreatePartnerDialog } from './create-partner-dialog'
import { AccountsImportDialog } from './components/accounts-import-dialog'
import { EntityKindSwitch } from './components/entity-kind-switch'
import { AccountSortSwitch } from './components/account-sort-switch'
import { AccountsToolbarTooltip } from './components/accounts-toolbar-tooltip'
import type { EmployeeBand, ReferencesFilter, SortMode } from './accounts-grid-types'

export function AccountsGridToolbar({
  search,
  setSearch,
  searchPlaceholder,
  favoritesOnly,
  setFavoritesOnly,
  canManage,
  isPartnerView,
  importing,
  importDialogOpen,
  setImportDialogOpen,
  entityKind,
  onImport,
  filterOpen,
  setFilterOpen,
  filtersActive,
  filterIndustry,
  setFilterIndustry,
  filterEmployeeBand,
  setFilterEmployeeBand,
  filterReferences,
  setFilterReferences,
  entityKindValue,
  onEntityKindChange,
  sortMode,
  setSortMode,
  createOpen,
  setCreateOpen,
  createPartnerOpen,
  setCreatePartnerOpen,
}: {
  search: string
  setSearch: (value: string) => void
  searchPlaceholder: string
  favoritesOnly: boolean
  setFavoritesOnly: (updater: (v: boolean) => boolean) => void
  canManage: boolean
  isPartnerView: boolean
  importing: boolean
  importDialogOpen: boolean
  setImportDialogOpen: (open: boolean) => void
  entityKind: AccountEntityKind
  onImport: (file: File) => Promise<boolean>
  filterOpen: boolean
  setFilterOpen: (open: boolean) => void
  filtersActive: boolean
  filterIndustry: string
  setFilterIndustry: (value: string) => void
  filterEmployeeBand: EmployeeBand
  setFilterEmployeeBand: (value: EmployeeBand) => void
  filterReferences: ReferencesFilter
  setFilterReferences: (value: ReferencesFilter) => void
  entityKindValue: AccountEntityKind
  onEntityKindChange: (next: AccountsListView) => void
  sortMode: SortMode
  setSortMode: (mode: SortMode) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
  createPartnerOpen: boolean
  setCreatePartnerOpen: (open: boolean) => void
}) {
  const industryFilterOptions = MASTER_INDUSTRIES

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToolbarSearchField
          variant="dashboard"
          wrapperClassName="flex-1"
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={setSearch}
          aria-label="Firmen durchsuchen"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <AccountsToolbarTooltip label={COPY.accounts.tooltipFavorites}>
            <Button
              type="button"
              variant="ghost"
              size="toolbar"
              className="shrink-0 px-2.5 hover:bg-muted/70"
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              aria-label={COPY.accounts.tooltipFavorites}
            >
              <AppIcon
                icon={StarIcon}
                size={16}
                className={
                  favoritesOnly
                    ? 'text-amber-500 dark:text-amber-400 [&_path]:fill-current'
                    : 'text-muted-foreground'
                }
              />
            </Button>
          </AccountsToolbarTooltip>
          {canManage ? (
            <>
              <AccountsToolbarTooltip
                label={
                  isPartnerView
                    ? COPY.accounts.bulkUploadTooltipPartner
                    : COPY.accounts.bulkUploadTooltip
                }
                className="max-w-[240px] text-center leading-snug"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  disabled={importing}
                  className="shrink-0 px-2.5 hover:bg-muted/70"
                  aria-label={
                    isPartnerView
                      ? COPY.accounts.bulkUploadTooltipPartner
                      : COPY.accounts.bulkUploadTooltip
                  }
                  onClick={() => setImportDialogOpen(true)}
                >
                  <AppIcon
                    icon={importing ? Loader : UploadIcon}
                    size={16}
                    className={importing ? 'animate-spin' : ''}
                  />
                </Button>
              </AccountsToolbarTooltip>
              <AccountsImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                entityKind={entityKind}
                importing={importing}
                onImport={onImport}
              />
            </>
          ) : null}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <AccountsToolbarTooltip label={COPY.accounts.tooltipFilter}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  className={`relative shrink-0 px-2.5 hover:bg-muted/70 ${filtersActive ? 'text-primary' : ''}`}
                  aria-expanded={filterOpen}
                  aria-label={COPY.accounts.tooltipFilter}
                >
                  <AppIcon
                    icon={Filter}
                    size={16}
                    className={filtersActive ? 'text-primary' : 'text-muted-foreground'}
                  />
                  {filtersActive ? (
                    <span
                      className="absolute right-1 top-1 size-1.5 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </Button>
              </PopoverTrigger>
            </AccountsToolbarTooltip>
            <PopoverContent className="w-[min(100vw-2rem,20rem)] space-y-4" align="end">
              <div className="space-y-1.5">
                <Label
                  htmlFor="account-filter-industry"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Branche
                </Label>
                <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                  <SelectTrigger id="account-filter-industry" className="h-9">
                    <SelectValue placeholder="Alle Branchen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Alle Branchen</SelectItem>
                    {industryFilterOptions.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.labelDe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="account-filter-employees"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Mitarbeiterzahl
                </Label>
                <Select
                  value={filterEmployeeBand}
                  onValueChange={(v) => setFilterEmployeeBand(v as EmployeeBand)}
                >
                  <SelectTrigger id="account-filter-employees" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Alle Größen</SelectItem>
                    <SelectItem value="unknown">Unbekannt</SelectItem>
                    <SelectItem value="s_50">1–50</SelectItem>
                    <SelectItem value="m_200">51–200</SelectItem>
                    <SelectItem value="l_1000">201–1.000</SelectItem>
                    <SelectItem value="xl">1.001+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="account-filter-refs"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Referenzen
                </Label>
                <Select
                  value={filterReferences}
                  onValueChange={(v) => setFilterReferences(v as ReferencesFilter)}
                >
                  <SelectTrigger id="account-filter-refs" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Alle</SelectItem>
                    <SelectItem value="with">Mit Referenzen</SelectItem>
                    <SelectItem value="without">Ohne Referenzen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setFilterIndustry('__all__')
                  setFilterEmployeeBand('any')
                  setFilterReferences('any')
                }}
              >
                Filter zurücksetzen
              </Button>
            </PopoverContent>
          </Popover>
          <EntityKindSwitch value={entityKindValue} onChange={onEntityKindChange} />
          <AccountSortSwitch value={sortMode} onChange={setSortMode} />
          {canManage ? (
            <>
              <Button
                type="button"
                size="toolbar"
                onClick={() =>
                  isPartnerView ? setCreatePartnerOpen(true) : setCreateOpen(true)
                }
              >
                <AppIcon icon={Plus} size={16} />
                {isPartnerView ? COPY.accounts.addPartner : COPY.accounts.addAccount}
              </Button>
              <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
              <CreatePartnerDialog
                open={createPartnerOpen}
                onOpenChange={setCreatePartnerOpen}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
