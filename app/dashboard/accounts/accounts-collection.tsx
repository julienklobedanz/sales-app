'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { AppDataTable } from '@/components/ui/app-data-table'
import { CollectionReadLayout } from '@/components/dashboard/collection-read-layout'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useRole } from '@/hooks/useRole'
import { resolveIndustryId } from '@/lib/constants/industries'
import { accountsReadHref } from '@/lib/accounts/accounts-list-view'
import type { AccountsNdaFilter } from '@/lib/accounts/account-collection-columns'
import { ACCOUNT_DEFAULT_VISIBLE } from '@/lib/accounts/account-collection-columns'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { ReferenceLayoutMode } from '@/app/dashboard/overview/reference-layout-switch'
import { bulkCreateCompaniesFromSheet } from './actions'
import { AccountsCollectionToolbar } from './accounts-collection-toolbar'
import { filterAccountCollectionRows } from './accounts-collection-filter'
import { buildAccountsTableColumns } from './accounts-table-columns'
import { AccountLensPane, type AccountLensPayload } from './account-lens-pane'
import { AccountsOnboardingEmptyState } from './components/accounts-onboarding-empty-state'
import { AccountsImportDialog } from './components/accounts-import-dialog'
import { CreateAccountDialog } from './create-account-dialog'
import { useAccountsTableColumnsState } from './use-accounts-table-columns-state'
import type { CompanyCard, ReferencesFilter } from './accounts-grid-types'

export function AccountsCollection({
  companies,
  lensPayload,
  layout,
}: {
  companies: CompanyCard[]
  lensPayload: AccountLensPayload | null
  layout: ReferenceLayoutMode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startViewTransition] = useTransition()
  const { isAdmin, isAccountManager } = useRole()
  const canCreateAccount = isAdmin || isAccountManager
  const [search, setSearch] = useState('')
  const [ndaFilter, setNdaFilter] = useState<AccountsNdaFilter>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [industryFilter, setIndustryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [referencesFilter, setReferencesFilter] = useState<ReferencesFilter>('any')
  const [createOpen, setCreateOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [columnResetKey, setColumnResetKey] = useState(0)
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    resetColumnsToDefault,
  } = useAccountsTableColumnsState()

  const industryOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const company of companies) {
      const id = resolveIndustryId(company.industry)
      if (id) ids.add(id)
    }
    return [...ids].sort()
  }, [companies])

  const locationOptions = useMemo(() => {
    const values = new Set<string>()
    for (const company of companies) {
      const hq = company.headquarters?.trim()
      if (hq) values.add(hq)
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'de'))
  }, [companies])

  const filtered = useMemo(
    () =>
      filterAccountCollectionRows(companies, {
        search,
        ndaFilter,
        favoritesOnly,
        industryFilter,
        locationFilter,
        referencesFilter,
      }),
    [
      companies,
      search,
      ndaFilter,
      favoritesOnly,
      industryFilter,
      locationFilter,
      referencesFilter,
    ],
  )

  const { selectedId, selected, hrefFor, clearSelection } = useCollectionObjectSelection({
    items: filtered,
    autoSelect: layout === 'inbox',
  })

  const columns = useMemo(() => buildAccountsTableColumns(), [])

  const previewOnboarding =
    process.env.NODE_ENV === 'development' &&
    searchParams.get('previewOnboarding') === '1'
  const showOnboarding =
    previewOnboarding ||
    (companies.length === 0 && !search.trim() && ndaFilter === 'all' && !favoritesOnly)

  function setLayout(mode: ReferenceLayoutMode) {
    const next = new URLSearchParams(searchParams.toString())
    if (mode === 'inbox') next.set('view', 'lesen')
    else next.delete('view')
    const qs = next.toString()
    startViewTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  async function handleBulkImport(file: File): Promise<boolean> {
    setImporting(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await bulkCreateCompaniesFromSheet(bytes, { entityKind: 'account' })
      if (!result.success) {
        toast.error(result.error ?? 'Import fehlgeschlagen.')
        return false
      }
      toast.success(
        `${result.createdCount} Accounts importiert (${result.skippedCount} übersprungen, ${result.failedCount} fehlgeschlagen).`,
      )
      router.refresh()
      return true
    } finally {
      setImporting(false)
    }
  }

  const toolbar = (
    <AccountsCollectionToolbar
      search={search}
      onSearchChange={setSearch}
      ndaFilter={ndaFilter}
      onNdaFilterChange={setNdaFilter}
      canCreateAccount={canCreateAccount}
      onCreate={() => setCreateOpen(true)}
      onImport={() => setImportDialogOpen(true)}
      importing={importing}
      layout={layout}
      onLayoutChange={setLayout}
      favoritesOnly={favoritesOnly}
      onFavoritesOnlyChange={setFavoritesOnly}
      industryFilter={industryFilter}
      onIndustryFilterChange={setIndustryFilter}
      industryOptions={industryOptions}
      locationFilter={locationFilter}
      onLocationFilterChange={setLocationFilter}
      locationOptions={locationOptions}
      referencesFilter={referencesFilter}
      onReferencesFilterChange={setReferencesFilter}
      columnVisibility={columnVisibility as Record<string, boolean>}
      onToggleColumn={(id, visible) =>
        setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
      }
      onResetColumns={() => {
        resetColumnsToDefault()
        setColumnResetKey((key) => key + 1)
      }}
    />
  )

  const table = (
    <AppDataTable
      key={columnResetKey}
      columns={columns}
      data={filtered}
      enableRowSelection={false}
      showViewOptions={false}
      initialSorting={[{ id: 'proofs', desc: true }]}
      initialColumnVisibility={ACCOUNT_DEFAULT_VISIBLE}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      columnSizing={columnSizing}
      onColumnSizingChange={setColumnSizing}
      enableColumnDrag
      enableColumnResize
      getRowId={(row) => row.id}
      getRowHref={(row) =>
        layout === 'inbox' ? hrefFor(row.id) : accountsReadHref(row.id)
      }
      rowIsActive={(row) => row.id === selectedId}
    />
  )

  return (
    <TooltipProvider delayDuration={300}>
      {showOnboarding ? (
        <AccountsOnboardingEmptyState
          onCreateManual={() => setCreateOpen(true)}
          canCreateManual={canCreateAccount}
        />
      ) : (
        <div className="space-y-5">
          {toolbar}
          {layout === 'inbox' ? (
            <CollectionReadLayout
              hasSelection={Boolean(selectedId)}
              onBack={clearSelection}
              list={<div className="min-h-0 flex-1 overflow-auto p-2">{table}</div>}
              pane={
                <AccountLensPane
                  company={selected}
                  payload={selected && selected.id === selectedId ? lensPayload : null}
                  canManageNda={canCreateAccount}
                  openNdaOnMount={searchParams.get('openNda') === '1'}
                />
              }
            />
          ) : (
            table
          )}
        </div>
      )}
      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AccountsImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        entityKind="account"
        importing={importing}
        onImport={handleBulkImport}
      />
    </TooltipProvider>
  )
}
