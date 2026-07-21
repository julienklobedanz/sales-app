'use client'

import { useState, useMemo, useLayoutEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import {
  formatIndustryDisplay,
  MASTER_INDUSTRIES,
  resolveIndustryId,
} from '@/lib/constants/industries'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { formatEmployeeCountDeDisplay } from '@/lib/format'
import { useRole } from '@/hooks/useRole'
import { CreateAccountDialog } from './create-account-dialog'
import { CreatePartnerDialog } from './create-partner-dialog'
import { CompaniesImportDialog } from './components/companies-import-dialog'
import { AccountsOnboardingEmptyState } from './components/accounts-onboarding-empty-state'
import { CrmImportPreviewDialog } from './components/crm-import-preview-dialog'
import { EntityKindSwitch } from './components/entity-kind-switch'
import { AccountSortSwitch } from './components/account-sort-switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AccountsToolbarTooltip } from './components/accounts-toolbar-tooltip'
import {
  accountsDetailHref,
  parseAccountsListView,
  type AccountsListView,
} from '@/lib/accounts/accounts-list-view'
import {
  setAccountsListViewOptimistic,
  syncAccountsListViewFromUrl,
  useAccountsListView,
} from '@/lib/accounts/accounts-list-view-store'
import { type CompanyEntityKind, type NdaDisplayStatus, partnerCategoryLabel } from '@/lib/accounts/company-entity'
import { NdaStatusBadge } from './components/nda-status-badge'
import { AccountStatusPicker } from './components/account-status-picker'
import type { CompanyAccountStatusValue } from '@/lib/accounts/company-account-status'
import type { AccountCardPrimaryAction } from '@/lib/accounts/account-card-primary-action'
import {
  accountStatusSortRank,
  nextUrgencySortKey,
} from '@/lib/accounts/account-status-sort'
import { useCrmOAuthCallback } from '@/hooks/use-crm-oauth-callback'
import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'
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
  account_status?: CompanyAccountStatusValue | null
  open_deals_count?: number | null
  contacts_count?: number | null
  reference_count?: number | null
  stakeholder_count?: number | null
  strategy_filled?: boolean | null
  signal_count?: number | null
  primary_action?: AccountCardPrimaryAction | null
  secondary_meta?: string | null
  sort_urgency_at?: string | null
}

export function CompaniesGrid({
  companies,
  hubspotConfigured = false,
  hubspotConnected = false,
  canConnectCrm = false,
}: {
  companies: CompanyCard[]
  hubspotConfigured?: boolean
  hubspotConnected?: boolean
  canConnectCrm?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startViewTransition] = useTransition()
  const listView = useAccountsListView()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CompanyCard | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createPartnerOpen, setCreatePartnerOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [crmImportOpen, setCrmImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
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

  const openCrmImport = useCallback(() => setCrmImportOpen(true), [])

  useCrmOAuthCallback({
    canConnectCrm,
    hubspotConnected,
    onOpenImport: openCrmImport,
  })

  useLayoutEffect(() => {
    syncAccountsListViewFromUrl(parseAccountsListView(searchParams))
  }, [searchParams])

  const entityKind: CompanyEntityKind = listView

  function setListView(next: AccountsListView) {
    setAccountsListViewOptimistic(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'partner') {
      params.set('view', 'partner')
    } else {
      params.delete('view')
    }
    const query = params.toString()
    const href = query ? `${pathname}?${query}` : pathname
    startViewTransition(() => {
      router.replace(href, { scroll: false })
    })
  }

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

  async function handleBulkImport(file: File): Promise<boolean> {
    setImporting(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await bulkCreateCompaniesFromSheet(bytes, { entityKind })
      if (!result.success) {
        toast.error(result.error ?? 'Import fehlgeschlagen.')
        return false
      }
      const label = entityKind === 'partner' ? 'Partner' : 'Accounts'
      toast.success(
        `${result.createdCount} ${label} importiert (${result.skippedCount} übersprungen, ${result.failedCount} fehlgeschlagen).`
      )
      router.refresh()
      return true
    } finally {
      setImporting(false)
    }
  }

  const companiesForEntity = useMemo(
    () =>
      companiesWithFavoriteState.filter(
        (c) => (c.entity_kind ?? 'account') === entityKind
      ),
    [companiesWithFavoriteState, entityKind]
  )

  const industryFilterOptions = MASTER_INDUSTRIES

  const filtersActive =
    filterIndustry !== '__all__' || filterEmployeeBand !== 'any' || filterReferences !== 'any'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = companiesForEntity
    if (favoritesOnly) {
      list = list.filter((c) => c.is_favorite)
    }
    if (filterIndustry !== '__all__') {
      list = list.filter((c) => resolveIndustryId(c.industry) === filterIndustry)
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
      const industry = formatIndustryDisplay(c.industry).toLowerCase()
      return name.includes(q) || industry.includes(q)
      })
    return [...searched].sort((a, b) => {
      if (sortMode === 'az') return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de')
      const rankA = accountStatusSortRank(a.account_status)
      const rankB = accountStatusSortRank(b.account_status)
      if (rankA !== rankB) return rankA - rankB
      const urgencyA = nextUrgencySortKey([a.sort_urgency_at, a.primary_action?.date])
      const urgencyB = nextUrgencySortKey([b.sort_urgency_at, b.primary_action?.date])
      if (urgencyA !== urgencyB) return urgencyA - urgencyB
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

  const previewOnboarding =
    process.env.NODE_ENV === 'development' && searchParams.get('previewOnboarding') === '1'

  const showAccountsOnboarding =
    (previewOnboarding && !isPartnerView) ||
    (!isPartnerView &&
      companiesForEntity.length === 0 &&
      !search.trim() &&
      !filtersActive &&
      !favoritesOnly)

  function companyHref(companyId: string, opts?: { edit?: boolean }) {
    let href = accountsDetailHref(companyId, isPartnerView ? 'partner' : 'account')
    if (opts?.edit) {
      href += `${href.includes('?') ? '&' : '?'}edit=1`
    }
    return href
  }

  function openCompany(companyId: string, opts?: { edit?: boolean }) {
    router.push(companyHref(companyId, opts))
  }

  const searchPlaceholder = isPartnerView
    ? COPY.accounts.searchPartnersPlaceholder
    : COPY.accounts.searchCompaniesPlaceholder

  function primaryLineClass(primary: AccountCardPrimaryAction): string {
    // Fallback/Signal = Meta-Stil wie Secondary (AT&T); Risk-Zeilen etwas größer, aber nicht fett.
    if (primary.kind === 'fallback' || primary.kind === 'signal') {
      return 'line-clamp-2 text-xs font-normal leading-snug text-muted-foreground'
    }
    if (primary.tone === 'danger') {
      return 'line-clamp-2 text-sm font-normal leading-snug text-red-600/80 dark:text-red-400/75'
    }
    if (primary.tone === 'warning') {
      return 'line-clamp-2 text-sm font-normal leading-snug text-amber-700/85 dark:text-amber-400/80'
    }
    return 'line-clamp-2 text-xs font-normal leading-snug text-muted-foreground'
  }

  function renderAccountCardBody(company: CompanyCard) {
    const primary = company.primary_action
    const secondary = (company.secondary_meta ?? '').trim()
    return (
      <div className="flex min-h-[132px] flex-col p-3.5">
        <div className="flex items-start gap-2.5">
          <CompanyLogo
            src={company.logo_url}
            companyId={company.id}
            alt={company.name}
            containerClassName="size-10 shrink-0 rounded-xl"
            fallbackIconSize={20}
            fallbackText={company.name}
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="truncate text-left text-base font-semibold leading-tight">
              {company.name}
            </CardTitle>
            {primary ? <p className={primaryLineClass(primary)}>{primary.label}</p> : null}
            {secondary ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">{secondary}</p>
            ) : (
              <p className="text-xs text-transparent">—</p>
            )}
          </div>
          <div className="relative -mt-0.5 shrink-0">
            <AccountStatusPicker
              companyId={company.id}
              status={company.account_status ?? null}
              canManage={canManage}
            />
            {canManage ? (
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <AccountsToolbarTooltip
                  label={
                    company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                  }
                >
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-sm hover:bg-muted/70"
                    aria-label={
                      company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                    }
                    disabled={favoriteSaving[company.id]}
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleToggleFavorite(company)
                    }}
                  >
                    <AppIcon
                      icon={StarIcon}
                      size={12}
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
                    className="inline-flex size-6 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-sm hover:bg-muted/70"
                    aria-label="Account bearbeiten"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCompany(company.id, { edit: true })
                    }}
                  >
                    <AppIcon icon={Pencil} size={12} />
                  </button>
                </AccountsToolbarTooltip>
                <AccountsToolbarTooltip label="Löschen">
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                    aria-label="Account löschen"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (deleting) return
                      setDeleteTarget(company)
                    }}
                  >
                    <AppIcon icon={Cancel01Icon} size={12} />
                  </button>
                </AccountsToolbarTooltip>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  function renderPartnerCardBody(company: CompanyCard) {
    return (
      <>
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
                    {company.linked_account_name ? `: ${company.linked_account_name}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            {partnerCategoryLabel(company.partner_category) ? (
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
                <span className="max-w-[150px] truncate">
                  {formatIndustryDisplay(company.industry)}
                </span>
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
                <span className="max-w-[140px] truncate">{company.headquarters}</span>
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
                  className="max-w-[160px] truncate text-muted-foreground hover:underline"
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
      </>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
    {showAccountsOnboarding ? (
      <>
        <AccountsOnboardingEmptyState
          onCreateManual={() => setCreateOpen(true)}
          canCreateManual={canManage}
          hubspotConfigured={hubspotConfigured}
          hubspotConnected={hubspotConnected}
          canConnectCrm={canConnectCrm}
          onConnectHubSpot={() => {
            window.location.href = getHubSpotConnectHref('accounts')
          }}
          onHubSpotClick={() => {
            if (hubspotConnected) {
              setCrmImportOpen(true)
            } else {
              window.location.href = getHubSpotConnectHref('accounts')
            }
          }}
        />
        {canManage ? (
          <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
        ) : null}
      </>
    ) : (
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
                  <CompaniesImportDialog
                    open={importDialogOpen}
                    onOpenChange={setImportDialogOpen}
                    entityKind={entityKind}
                    importing={importing}
                    onImport={handleBulkImport}
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
                  <Label htmlFor="account-filter-industry" className="text-xs font-medium text-muted-foreground">
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
            <EntityKindSwitch value={entityKind} onChange={setListView} />
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
                <Card className="group relative h-full overflow-visible rounded-3xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                  {canManage && isPartnerView ? (
                    <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <AccountsToolbarTooltip
                        label={
                          company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                        }
                      >
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-sm hover:bg-muted/70 hover:text-foreground"
                          aria-label={
                            company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'
                          }
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
                            openCompany(company.id, { edit: true })
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
                    {isPartnerView
                      ? renderPartnerCardBody(company)
                      : renderAccountCardBody(company)}
                  </div>
                </Card>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-56">
                <ContextMenuItem asChild>
                  <Link href={companyHref(company.id)}>Öffnen</Link>
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
                      <Link href={companyHref(company.id, { edit: true })}>Bearbeiten</Link>
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
      {canConnectCrm ? (
        <CrmImportPreviewDialog open={crmImportOpen} onOpenChange={setCrmImportOpen} />
      ) : null}
    </TooltipProvider>
  )
}
