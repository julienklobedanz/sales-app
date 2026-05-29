'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Cancel01Icon,
  Building2,
  Filter,
  Globe,
  Loader,
  MapPinIcon,
  Pencil,
  Plus,
  StarIcon,
  UploadIcon,
  Users,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { CompanyLogo } from '@/components/ui/company-logo'
import { bulkCreateCompaniesFromSheet, deleteCompanyWithData, toggleCompanyFavorite } from './actions'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { formatEmployeeCountDeDisplay } from '@/lib/format'
import { useRole } from '@/hooks/useRole'
import { CreateAccountDialog } from './create-account-dialog'
import { CreatePartnerDialog } from './create-partner-dialog'
import { EntityKindSwitch } from './components/entity-kind-switch'
import { AccountSortSwitch } from './components/account-sort-switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AccountsToolbarTooltip } from './components/accounts-toolbar-tooltip'
import { type CompanyEntityKind, type NdaDisplayStatus, partnerCategoryLabel } from '@/lib/accounts/company-entity'
import { NdaStatusBadge } from './components/nda-status-badge'
import { toast } from 'sonner'

export type CompanyCard = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  employee_count?: number | null
  is_favorite?: boolean | null
  entity_kind?: CompanyEntityKind
  partner_category?: string | null
  linked_account_id?: string | null
  linked_account_name?: string | null
  nda_status?: NdaDisplayStatus
  open_deals_count?: number | null
  contacts_count?: number | null
  reference_count?: number | null
  stakeholder_count?: number | null
  strategy_filled?: boolean | null
  signal_count?: number | null
}

export function CompaniesGrid({ companies }: { companies: CompanyCard[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CompanyCard | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [entityKind, setEntityKind] = useState<CompanyEntityKind>('account')
  const [createOpen, setCreateOpen] = useState(false)
  const [createPartnerOpen, setCreatePartnerOpen] = useState(false)
  const [importingAccounts, setImportingAccounts] = useState(false)
  const [sortMode, setSortMode] = useState<'activity' | 'az'>('activity')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterIndustry, setFilterIndustry] = useState<string>('__all__')
  const [filterEmployeeBand, setFilterEmployeeBand] = useState<
    'any' | 'unknown' | 's_50' | 'm_200' | 'l_1000' | 'xl'
  >('any')
  const [filterReferences, setFilterReferences] = useState<'any' | 'with' | 'without'>('any')
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const [favoriteSaving, setFavoriteSaving] = useState<Record<string, boolean>>({})
  const { isAdmin, isAccountManager } = useRole()
  const canManage = isAdmin || isAccountManager
  const importInputRef = useRef<HTMLInputElement | null>(null)

  function employeeLabel(value: number | null | undefined): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    return `${formatEmployeeCountDeDisplay(value)} Mitarbeiter`
  }

  const companiesWithFavoriteState = useMemo(
    () =>
      companies.map((company) => ({
        ...company,
        is_favorite:
          favoriteOverrides[company.id] === undefined
            ? Boolean(company.is_favorite)
            : favoriteOverrides[company.id],
      })),
    [companies, favoriteOverrides]
  )

  async function handleToggleFavorite(company: CompanyCard) {
    const current = favoriteOverrides[company.id] === undefined
      ? Boolean(company.is_favorite)
      : favoriteOverrides[company.id]
    const next = !current
    setFavoriteOverrides((prev) => ({ ...prev, [company.id]: next }))
    setFavoriteSaving((prev) => ({ ...prev, [company.id]: true }))
    const result = await toggleCompanyFavorite(company.id, next)
    setFavoriteSaving((prev) => ({ ...prev, [company.id]: false }))
    if (!result.success) {
      setFavoriteOverrides((prev) => ({ ...prev, [company.id]: current }))
      toast.error(result.error ?? 'Favorit konnte nicht gespeichert werden.')
    }
  }

  async function handleAccountImport(file: File) {
    setImportingAccounts(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await bulkCreateCompaniesFromSheet(bytes)
      if (!result.success) {
        toast.error(result.error ?? 'Import fehlgeschlagen.')
        return
      }
      toast.success(
        `${result.createdCount} Accounts importiert (${result.skippedCount} übersprungen, ${result.failedCount} fehlgeschlagen).`
      )
      router.refresh()
    } finally {
      setImportingAccounts(false)
    }
  }

  const companiesForEntity = useMemo(
    () =>
      companiesWithFavoriteState.filter(
        (c) => (c.entity_kind ?? 'account') === entityKind
      ),
    [companiesWithFavoriteState, entityKind]
  )

  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>()
    for (const c of companiesForEntity) {
      const v = String(c.industry ?? '').trim()
      if (v) set.add(v)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'de'))
  }, [companiesForEntity])

  const filtersActive =
    filterIndustry !== '__all__' || filterEmployeeBand !== 'any' || filterReferences !== 'any'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = companiesForEntity
    if (favoritesOnly) {
      list = list.filter((c) => c.is_favorite)
    }
    if (filterIndustry !== '__all__') {
      const want = filterIndustry.trim().toLowerCase()
      list = list.filter((c) => String(c.industry ?? '').trim().toLowerCase() === want)
    }
    if (filterEmployeeBand !== 'any') {
      const band = filterEmployeeBand
      list = list.filter((c) => {
        const count = c.employee_count
        if (band === 'unknown') return count == null || !Number.isFinite(count)
        if (count == null || !Number.isFinite(count)) return false
        const n = count
        if (band === 's_50') return n >= 1 && n <= 50
        if (band === 'm_200') return n >= 51 && n <= 200
        if (band === 'l_1000') return n >= 201 && n <= 1000
        return n >= 1001
      })
    }
    if (filterReferences === 'with') {
      list = list.filter((c) => (c.reference_count ?? 0) > 0)
    } else if (filterReferences === 'without') {
      list = list.filter((c) => (c.reference_count ?? 0) === 0)
    }
    const searched = !q
      ? list
      : list.filter((c) => {
      const name = (c.name ?? '').toLowerCase()
      const industry = (c.industry ?? '').toLowerCase()
      return name.includes(q) || industry.includes(q)
      })
    return [...searched].sort((a, b) => {
      if (sortMode === 'az') return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de')
      const scoreA = (a.signal_count ?? 0) * 100 + (a.open_deals_count ?? 0) * 10 + (a.reference_count ?? 0)
      const scoreB = (b.signal_count ?? 0) * 100 + (b.open_deals_count ?? 0) * 10 + (b.reference_count ?? 0)
      if (scoreA !== scoreB) return scoreB - scoreA
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de')
    })
  }, [
    companiesForEntity,
    search,
    favoritesOnly,
    sortMode,
    filterIndustry,
    filterEmployeeBand,
    filterReferences,
  ])

  const isPartnerView = entityKind === 'partner'
  const searchPlaceholder = isPartnerView
    ? COPY.accounts.searchPartnersPlaceholder
    : COPY.accounts.searchCompaniesPlaceholder

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-5 rounded-3xl bg-muted/10 p-4 md:p-6">
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
              {canManage && !isPartnerView ? (
                <>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleAccountImport(file)
                      e.target.value = ''
                    }}
                  />
                  <AccountsToolbarTooltip
                    label={COPY.accounts.bulkUploadTooltip}
                    className="max-w-[240px] text-center leading-snug"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="toolbar"
                      disabled={importingAccounts}
                      className="shrink-0 px-2.5 hover:bg-muted/70"
                      aria-label={COPY.accounts.bulkUploadTooltip}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const file = e.dataTransfer.files?.[0]
                        if (file) void handleAccountImport(file)
                      }}
                      onClick={() => importInputRef.current?.click()}
                    >
                      <AppIcon
                        icon={importingAccounts ? Loader : UploadIcon}
                        size={16}
                        className={importingAccounts ? 'animate-spin' : ''}
                      />
                    </Button>
                  </AccountsToolbarTooltip>
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
                  <Label htmlFor="account-filter-industry" className="text-xs font-medium text-muted-foreground">
                    Branche
                  </Label>
                  <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                    <SelectTrigger id="account-filter-industry" className="h-9">
                      <SelectValue placeholder="Alle Branchen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Alle Branchen</SelectItem>
                      {uniqueIndustries.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account-filter-employees" className="text-xs font-medium text-muted-foreground">
                    Mitarbeiterzahl
                  </Label>
                  <Select
                    value={filterEmployeeBand}
                    onValueChange={(v) =>
                      setFilterEmployeeBand(v as typeof filterEmployeeBand)
                    }
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
                  <Label htmlFor="account-filter-refs" className="text-xs font-medium text-muted-foreground">
                    Referenzen
                  </Label>
                  <Select
                    value={filterReferences}
                    onValueChange={(v) => setFilterReferences(v as typeof filterReferences)}
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
            <EntityKindSwitch value={entityKind} onChange={setEntityKind} />
            <AccountSortSwitch value={sortMode} onChange={setSortMode} />
            {canManage ? (
              <>
                <Button
                  type="button"
                  size="toolbar"
                  className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
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

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {companiesForEntity.length === 0
            ? isPartnerView
              ? 'Noch keine Partner angelegt.'
              : 'Noch keine Accounts angelegt.'
            : favoritesOnly && !search.trim() && !filtersActive
              ? 'Keine Favoriten in dieser Ansicht.'
              : search.trim() || filtersActive || favoritesOnly
                ? isPartnerView
                  ? 'Keine Partner für diese Suche oder Filter.'
                  : 'Keine Accounts für diese Suche oder Filter.'
                : isPartnerView
                  ? 'Kein Partner unter diesem Namen gefunden.'
                  : 'Keine Firma unter diesem Namen gefunden.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <ContextMenu key={company.id}>
              <ContextMenuTrigger asChild>
                <Card className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                  {canManage ? (
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <AccountsToolbarTooltip
                        label={
                          company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                        }
                      >
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-sm hover:bg-muted/70 hover:text-foreground"
                        aria-label={company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                        disabled={favoriteSaving[company.id]}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleToggleFavorite(company)
                        }}
                      >
                        <AppIcon
                          icon={StarIcon}
                          size={14}
                          className={
                            company.is_favorite
                              ? 'text-amber-500 dark:text-amber-400 [&_path]:fill-current'
                              : 'text-muted-foreground'
                          }
                        />
                      </button>
                      </AccountsToolbarTooltip>
                      <AccountsToolbarTooltip label="Bearbeiten">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-sm hover:bg-muted/70 hover:text-foreground"
                        aria-label="Account bearbeiten"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`${ROUTES.accountsDetail(company.id)}?edit=1`)
                        }}
                      >
                        <AppIcon icon={Pencil} size={14} />
                      </button>
                      </AccountsToolbarTooltip>
                      <AccountsToolbarTooltip label="Löschen">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                        aria-label="Account löschen"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (deleting) return
                          setDeleteTarget(company)
                        }}
                      >
                        <AppIcon icon={Cancel01Icon} size={14} />
                      </button>
                      </AccountsToolbarTooltip>
                    </div>
                  ) : null}
                  <div
                    role="link"
                    tabIndex={0}
                    className="block h-full cursor-pointer transition-opacity duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => router.push(ROUTES.accountsDetail(company.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(ROUTES.accountsDetail(company.id))
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <CompanyLogo
                            src={company.logo_url}
                            companyId={company.id}
                            alt={company.name}
                            containerClassName="size-12 shrink-0 rounded-2xl"
                            fallbackIconSize={24}
                            fallbackText={company.name}
                          />
                          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                            <CardTitle className="w-full truncate text-left text-base font-semibold">
                              {company.name}
                            </CardTitle>
                            <div className="mt-0.5 w-full text-left">
                              <NdaStatusBadge
                                status={company.nda_status ?? 'none'}
                                compact
                                subtle
                              />
                            </div>
                            {company.linked_account_name ? (
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {COPY.accounts.alsoLinkedAccountHint}
                                {company.linked_account_name
                                  ? `: ${company.linked_account_name}`
                                  : ''}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-1 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-3">
                        {isPartnerView && partnerCategoryLabel(company.partner_category) ? (
                          <div className="flex items-center gap-1.5">
                            <AppIcon icon={Users} size={14} className="shrink-0" />
                            <span className="max-w-[150px] truncate">
                              {partnerCategoryLabel(company.partner_category)}
                            </span>
                          </div>
                        ) : null}
                        {company.industry && (
                          <div className="flex items-center gap-1.5">
                            <AppIcon icon={Building2} size={14} className="shrink-0" />
                            <span className="max-w-[150px] truncate">{company.industry}</span>
                          </div>
                        )}
                        {employeeLabel(company.employee_count) && (
                          <div className="flex items-center gap-1.5">
                            <AppIcon icon={Users} size={14} className="shrink-0" />
                            <span className="max-w-[160px] truncate">{employeeLabel(company.employee_count)}</span>
                          </div>
                        )}
                        {company.headquarters && (
                          <div className="flex items-center gap-1.5">
                            <AppIcon icon={MapPinIcon} size={14} className="shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {company.headquarters}
                            </span>
                          </div>
                        )}
                        {company.website_url && (
                          <div className="flex items-center gap-1.5">
                            <AppIcon icon={Globe} size={14} className="shrink-0" />
                            <a
                              href={
                                company.website_url.startsWith('http')
                                  ? company.website_url
                                  : `https://${company.website_url}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="truncate max-w-[160px] text-muted-foreground hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardContent className="pt-2 pb-3 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <AppIcon icon={Users} size={14} />
                        <span>
                          {company.reference_count ?? 0}{' '}
                          {(company.reference_count ?? 0) === 1 ? 'Referenz' : 'Referenzen'}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-56">
                <ContextMenuItem asChild>
                  <Link href={ROUTES.accountsDetail(company.id)}>Öffnen</Link>
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    void handleToggleFavorite(company)
                  }}
                >
                  {company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                </ContextMenuItem>

                {canManage ? (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem asChild>
                      <Link href={`${ROUTES.accountsDetail(company.id)}?edit=1`}>Bearbeiten</Link>
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        e.preventDefault()
                        if (deleting) return
                        setDeleteTarget(company)
                      }}
                    >
                      Löschen
                    </ContextMenuItem>
                  </>
                ) : null}
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du dir absolut sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Dies wird den Kunden und alle damit verbundenen Deals,
              Strategien und Kontakte dauerhaft löschen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => {
                if (!deleting) setDeleteTarget(null)
              }}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !deleteTarget}
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  setDeleting(true)
                  const result = await deleteCompanyWithData(deleteTarget.id)
                  if (!result.success && result.error) {
                    console.error(result.error)
                  }
                  setDeleteTarget(null)
                } finally {
                  setDeleting(false)
                }
              }}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deleting && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  )
}
