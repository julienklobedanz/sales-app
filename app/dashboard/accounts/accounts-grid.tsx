'use client'

import { useState, useMemo, useLayoutEffect, useTransition, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { bulkCreateCompaniesFromSheet, toggleCompanyFavorite } from './actions'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { useRole } from '@/hooks/useRole'
import { CreateAccountDialog } from './create-account-dialog'
import { AccountsOnboardingEmptyState } from './components/accounts-onboarding-empty-state'
import { CrmImportPreviewDialog } from './components/crm-import-preview-dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  parseAccountsListView,
  type AccountsListView,
} from '@/lib/accounts/accounts-list-view'
import {
  setAccountsListViewOptimistic,
  syncAccountsListViewFromUrl,
  useAccountsListView,
} from '@/lib/accounts/accounts-list-view-store'
import { type CompanyEntityKind } from '@/lib/accounts/company-entity'
import { useCrmOAuthCallback } from '@/hooks/use-crm-oauth-callback'
import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'
import { toast } from 'sonner'
import { AccountGridCard } from './accounts-grid-cards'
import { AccountsGridDeleteDialog } from './accounts-grid-delete-dialog'
import {
  companyHref,
  filterAndSortCompanies,
  filtersAreActive,
} from './accounts-grid-filters'
import { AccountsGridToolbar } from './accounts-grid-toolbar'
import type {
  CompanyCard,
  EmployeeBand,
  ReferencesFilter,
  SortMode,
} from './accounts-grid-types'

export type { CompanyCard } from './accounts-grid-types'

export function AccountsGrid({
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
  const [sortMode, setSortMode] = useState<SortMode>('activity')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterIndustry, setFilterIndustry] = useState<string>('__all__')
  const [filterEmployeeBand, setFilterEmployeeBand] = useState<EmployeeBand>('any')
  const [filterReferences, setFilterReferences] = useState<ReferencesFilter>('any')
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

  const companiesWithFavoriteState = useMemo(
    () =>
      companies.map((company) => ({
        ...company,
        is_favorite:
          favoriteOverrides[company.id] === undefined
            ? Boolean(company.is_favorite)
            : favoriteOverrides[company.id],
      })),
    [companies, favoriteOverrides],
  )

  async function handleToggleFavorite(company: CompanyCard) {
    const current =
      favoriteOverrides[company.id] === undefined
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
        `${result.createdCount} ${label} importiert (${result.skippedCount} übersprungen, ${result.failedCount} fehlgeschlagen).`,
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
        (c) => (c.entity_kind ?? 'account') === entityKind,
      ),
    [companiesWithFavoriteState, entityKind],
  )

  const filtersActive = filtersAreActive(
    filterIndustry,
    filterEmployeeBand,
    filterReferences,
  )

  const filtered = useMemo(
    () =>
      filterAndSortCompanies(companiesForEntity, {
        search,
        favoritesOnly,
        sortMode,
        filterIndustry,
        filterEmployeeBand,
        filterReferences,
      }),
    [
      companiesForEntity,
      search,
      favoritesOnly,
      sortMode,
      filterIndustry,
      filterEmployeeBand,
      filterReferences,
    ],
  )

  const isPartnerView = entityKind === 'partner'

  const previewOnboarding =
    process.env.NODE_ENV === 'development' &&
    searchParams.get('previewOnboarding') === '1'

  const showAccountsOnboarding =
    (previewOnboarding && !isPartnerView) ||
    (!isPartnerView &&
      companiesForEntity.length === 0 &&
      !search.trim() &&
      !filtersActive &&
      !favoritesOnly)

  function openCompany(companyId: string, opts?: { edit?: boolean }) {
    router.push(companyHref(companyId, isPartnerView, opts))
  }

  const searchPlaceholder = isPartnerView
    ? COPY.accounts.searchPartnersPlaceholder
    : COPY.accounts.searchCompaniesPlaceholder

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
          <AccountsGridToolbar
            search={search}
            setSearch={setSearch}
            searchPlaceholder={searchPlaceholder}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            canManage={canManage}
            isPartnerView={isPartnerView}
            importing={importing}
            importDialogOpen={importDialogOpen}
            setImportDialogOpen={setImportDialogOpen}
            entityKind={entityKind}
            onImport={handleBulkImport}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            filtersActive={filtersActive}
            filterIndustry={filterIndustry}
            setFilterIndustry={setFilterIndustry}
            filterEmployeeBand={filterEmployeeBand}
            setFilterEmployeeBand={setFilterEmployeeBand}
            filterReferences={filterReferences}
            setFilterReferences={setFilterReferences}
            entityKindValue={entityKind}
            onEntityKindChange={setListView}
            sortMode={sortMode}
            setSortMode={setSortMode}
            createOpen={createOpen}
            setCreateOpen={setCreateOpen}
            createPartnerOpen={createPartnerOpen}
            setCreatePartnerOpen={setCreatePartnerOpen}
          />

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
                <AccountGridCard
                  key={company.id}
                  company={company}
                  isPartnerView={isPartnerView}
                  canManage={canManage}
                  favoriteSaving={Boolean(favoriteSaving[company.id])}
                  deleting={deleting}
                  onOpen={() => router.push(ROUTES.accountsDetail(company.id))}
                  onEdit={() => openCompany(company.id, { edit: true })}
                  onToggleFavorite={() => {
                    void handleToggleFavorite(company)
                  }}
                  onRequestDelete={() => setDeleteTarget(company)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <AccountsGridDeleteDialog
        deleteTarget={deleteTarget}
        deleting={deleting}
        setDeleteTarget={setDeleteTarget}
        setDeleting={setDeleting}
      />
      {canConnectCrm ? (
        <CrmImportPreviewDialog open={crmImportOpen} onOpenChange={setCrmImportOpen} />
      ) : null}
    </TooltipProvider>
  )
}
