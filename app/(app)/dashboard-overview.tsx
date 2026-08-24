'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReferenceRow } from './actions'
import {
  isSalesAppView,
  userCanCreateReference,
  userCanEditReference,
  canManageReferencesAsAdmin,
} from '@/lib/roles/reference-access'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { deleteReference, toggleFavorite } from './actions'
import type { Profile } from './dashboard-types'
import { ReferenceLibraryToolbar } from './overview/reference-library-toolbar'
import type { ReferenceLayoutMode } from './overview/reference-layout-switch'
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
} from './overview/reference-overview-columns'
import {
  buildReferenceFilterOptions,
  filterAndSortReferences,
  normalizeTagLabel,
} from './overview/filter-sort-references'
import { ReferencesDataTable } from './overview/references-data-table'
import {
  buildCompanyIdsNeedingBrandfetch,
  buildCompanyIndustryById,
  buildCompanyLogoById,
} from './overview/reference-company-maps'
import {
  copyReferenceShareLink,
  createAndCopyCollectionShareLink,
} from './overview/reference-overview-share-link'
import { ReferencesOverviewBrandfetchSync } from './overview/references-overview-brandfetch-sync'
import { ReferencesBulkActionsBar } from './overview/references-bulk-actions-bar'
import type { ReferenceColumnKey } from './overview/reference-table-column-types'
import { useReferenceOverviewColumns } from './overview/use-reference-overview-columns'
import { useReferencesOverviewDialogsState } from './overview/use-references-overview-dialogs-state'
import { ReferenceOnboardingEmptyState } from '@/app/(app)/references/components/reference-onboarding-empty-state'
import { toast } from 'sonner'
import type { OrgDateDisplayFormat } from '@/lib/format'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { referencesReadHref } from '@/lib/references/references-list-view'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'

const InboxReferencesConceptClient = dynamic(
  () =>
    import('@/app/(app)/overview/inbox-references/client').then((m) => ({
      default: m.InboxReferencesConceptClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[32rem] w-full animate-pulse rounded-lg border border-border/60 bg-muted/30"
        aria-busy
        aria-label="Laden"
      />
    ),
  },
)

// --- Hauptkomponente ---

type CompanyOption = {
  id: string
  name: string
  logo_url?: string | null
  industry?: string | null
}
type ContactOption = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

export function DashboardOverview({
  references: initialReferences,
  deletedCount,
  profile,
  initialFavoritesOnly = false,
  initialStatusFilter = 'all',
  companies = [],
  contacts = [],
  externalContacts = [],
  orgDateDisplayFormat = 'de-DE',
}: {
  references: ReferenceRow[]
  totalCount: number
  deletedCount: number
  profile: Profile
  initialFavoritesOnly?: boolean
  initialStatusFilter?: string
  companies?: CompanyOption[]
  contacts?: ContactOption[]
  externalContacts?: {
    id: string
    company_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    phone?: string | null
  }[]
  orgDateDisplayFormat?: OrgDateDisplayFormat | string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter)
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [tagsFilter, setTagsFilter] = useState<string>('all')
  const [industryFilter, setIndustryFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all')
  const [volumeFilter, setVolumeFilter] = useState<ReferenceVolumeFilter>('all')
  const [companySearch, setCompanySearch] = useState('')
  const [tagsSearch, setTagsSearch] = useState('')
  const [industrySearch, setIndustrySearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [projectStatusSearch, setProjectStatusSearch] = useState('')
  const [sortKey, setSortKey] = useState<(typeof COLUMN_KEYS)[number] | null>(
    'project_year',
  )
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly)
  const viewParam = searchParams.get('view')
  const referenceLayout: ReferenceLayoutMode = viewParam === 'lesen' ? 'inbox' : 'table'
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null)
  const {
    setBulkImportOpen,
    setBulkImportGroups,
    addBulkImportFiles,
    setNewRefModalOpen,
    setBulkDeleteConfirmOpen,
    selectedRefIds,
    setSelectedRefIds,
    renderDialogs,
  } = useReferencesOverviewDialogsState()
  const [pageSize, setPageSize] = useState(30)
  const [pageIndex, setPageIndex] = useState(0)
  const {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    columnWidths,
    dragOverColumn,
    setDragOverColumn,
    handleColumnWidthChange,
    resetColumnsToDefault,
    orderedVisibleColumnKeys,
    moveColumnOrder,
  } = useReferenceOverviewColumns()

  const handleReferenceLayoutChange = useCallback(
    (mode: ReferenceLayoutMode) => {
      const next = new URLSearchParams(searchParams.toString())
      if (mode === 'inbox') next.set('view', 'lesen')
      else next.delete('view')
      const qs = next.toString()
      router.replace(qs ? `?${qs}` : '?', { scroll: false })
    },
    [router, searchParams],
  )

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialReferences.filter((r) => r.is_favorited).map((r) => r.id)),
  )

  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    // Optimistisches Update im UI
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    void toggleFavorite(id).then(
      () => {
        toast.success('Favoriten aktualisiert')
      },
      () => {
        // Revert bei Fehler
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        toast.error('Fehler beim Aktualisieren der Favoriten')
      },
    )
  }

  const referencesWithLocalFavorites = useMemo(
    () =>
      initialReferences.map((r) => ({
        ...r,
        is_favorited: favoriteIds.has(r.id),
      })),
    [initialReferences, favoriteIds],
  )

  const companyLogoById = useMemo(
    () => buildCompanyLogoById(companies, initialReferences),
    [companies, initialReferences],
  )

  const companyIndustryById = useMemo(
    () => buildCompanyIndustryById(companies),
    [companies],
  )

  const companyIdsNeedingBrandfetch = useMemo(
    () =>
      buildCompanyIdsNeedingBrandfetch(initialReferences, companies, companyIndustryById),
    [initialReferences, companies, companyIndustryById],
  )

  const filterOptions = useMemo(
    () =>
      buildReferenceFilterOptions(
        initialReferences,
        companyIndustryById,
        normalizeTagLabel,
      ),
    [initialReferences, companyIndustryById],
  )

  const salesAppView = isSalesAppView(profile.systemRole, profile.functionRole)

  // Client-seitiges Filtering (Sales: draft nie anzeigen; optional nur Favoriten) + Sortierung
  const filteredReferences = useMemo(
    () =>
      filterAndSortReferences({
        references: referencesWithLocalFavorites,
        salesAppView,
        favoritesOnly,
        search,
        statusFilter,
        companyFilter,
        tagsFilter,
        industryFilter,
        countryFilter,
        projectStatusFilter,
        volumeFilter,
        sortKey,
        sortDir,
        companyIndustryById,
      }),
    [
      referencesWithLocalFavorites,
      salesAppView,
      search,
      statusFilter,
      companyFilter,
      tagsFilter,
      industryFilter,
      countryFilter,
      projectStatusFilter,
      volumeFilter,
      favoritesOnly,
      sortKey,
      sortDir,
      companyIndustryById,
    ],
  )

  const pageCount = Math.max(1, Math.ceil(filteredReferences.length / pageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const paginatedReferences = useMemo(() => {
    const start = safePageIndex * pageSize
    return filteredReferences.slice(start, start + pageSize)
  }, [filteredReferences, safePageIndex, pageSize])

  const handleSort = (column: (typeof COLUMN_KEYS)[number]) => {
    if (sortKey === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(column)
      setSortDir('asc')
    }
  }

  const openDetail = (ref: ReferenceRow) => {
    router.push(referencesReadHref(ref.id))
  }

  const toggleCart = (refId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedRefIds((prev) => {
      const next = new Set(prev)
      if (next.has(refId)) next.delete(refId)
      else next.add(refId)
      return next
    })
  }

  const selectedRefs = useMemo(
    () => initialReferences.filter((r) => selectedRefIds.has(r.id)),
    [initialReferences, selectedRefIds],
  )
  const filteredSelectedCount = useMemo(
    () => filteredReferences.filter((r) => selectedRefIds.has(r.id)).length,
    [filteredReferences, selectedRefIds],
  )
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()

    toast.promise(deleteReference(id), {
      loading: 'Lösche Referenz...',
      success: () => {
        router.refresh()
        return 'Referenz erfolgreich gelöscht'
      },
      error: 'Fehler beim Löschen der Referenz',
    })
  }

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    toast.success('ID in die Zwischenablage kopiert')
  }

  const canCreateReference = userCanCreateReference(
    profile.functionRole,
    profile.systemRole,
    profile.capabilities,
  )
  const filtersActive =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    favoritesOnly ||
    companyFilter !== 'all' ||
    tagsFilter !== 'all' ||
    industryFilter !== 'all' ||
    countryFilter !== 'all' ||
    projectStatusFilter !== 'all' ||
    volumeFilter !== 'all'
  const showReferencesOnboarding =
    ((process.env.NODE_ENV === 'development' &&
      searchParams.get('previewOnboarding') === '1') ||
      (initialReferences.length === 0 && !filtersActive))

  if (showReferencesOnboarding) {
    const isAdmin = isSystemAdmin(profile.systemRole)

    const handleEmptyStateUpload = (files: File[]) => {
      if (!isAdmin) {
        toast.info(
          'Bulk-Import ist nur für Admins verfügbar. Nutze „Ref. manuell erstellen“.',
        )
        return
      }
      setBulkImportGroups([])
      addBulkImportFiles(files)
      setBulkImportOpen(true)
    }

    return (
      <>
        <ReferenceOnboardingEmptyState
          canCreate={canCreateReference}
          onUploadFiles={isAdmin ? handleEmptyStateUpload : undefined}
          onCreateManual={canCreateReference ? () => setNewRefModalOpen(true) : undefined}
        />
        {renderDialogs({
          profile,
          companies,
          contacts,
          externalContacts,
          deletedCount,
        })}
      </>
    )
  }

  return (
    <div className="flex min-w-0 flex-col space-y-5">
      <ReferencesOverviewBrandfetchSync companyIds={companyIdsNeedingBrandfetch} />
      {/* Toolbar & Tabelle — einheitlicher Abstand zwischen Toolbar und Listeninhalt */}
      <div className="flex min-w-0 flex-col gap-4">
        <ReferenceLibraryToolbar
          referenceLayout={referenceLayout}
          onReferenceLayoutChange={handleReferenceLayoutChange}
          searchValue={search}
          onSearchChange={setSearch}
          canCreateReference={canCreateReference}
          canImportReference={isSystemAdmin(profile.systemRole)}
          favoritesOnly={favoritesOnly}
          onFavoritesOnlyChange={setFavoritesOnly}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          volumeFilter={volumeFilter}
          onVolumeFilterChange={setVolumeFilter}
          industryFilter={industryFilter}
          onIndustryFilterChange={setIndustryFilter}
          companyFilter={companyFilter}
          onCompanyFilterChange={setCompanyFilter}
          tagsFilter={tagsFilter}
          onTagsFilterChange={setTagsFilter}
          countryFilter={countryFilter}
          onCountryFilterChange={setCountryFilter}
          projectStatusFilter={projectStatusFilter}
          onProjectStatusFilterChange={setProjectStatusFilter}
          statusOptions={filterOptions.statuses}
          statusLabels={STATUS_LABELS}
          industryOptions={filterOptions.industries}
          companyOptions={filterOptions.companies}
          tagsOptions={filterOptions.tags}
          countryOptions={filterOptions.countries}
          projectStatusOptions={filterOptions.projectStatuses}
          projectStatusLabels={PROJECT_STATUS_LABELS}
          columnOrder={columnOrder}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onResetColumns={resetColumnsToDefault}
          columnLabels={COLUMN_LABELS}
          onImportClick={() => {
            setBulkImportGroups([])
            setBulkImportOpen(true)
          }}
          onCreateReferenceClick={() => setNewRefModalOpen(true)}
        />

        <ReferencesBulkActionsBar
            selectedCount={selectedRefIds.size}
            showSalesActions={salesAppView}
            showAdminDelete={isSystemAdmin(profile.systemRole)}
            onClearSelection={() => setSelectedRefIds(new Set())}
            onBulkDelete={() => setBulkDeleteConfirmOpen(true)}
            onCreateSharedPortfolio={async () => {
              await createAndCopyCollectionShareLink(Array.from(selectedRefIds))
            }}
            onDownloadPdfs={() => {
              const base = process.env.NEXT_PUBLIC_SUPABASE_URL
              const withFile = selectedRefs.filter((r) => r.file_path)
              if (withFile.length === 0) {
                toast.error(
                  'Keine der ausgewählten Referenzen hat ein Dokument zum Herunterladen.',
                )
                return
              }
              withFile.forEach((r) => {
                const url = `${base}/storage/v1/object/public/references/${r.file_path}`
                window.open(url, '_blank', 'noopener,noreferrer')
              })
              toast.success(
                `${withFile.length} Referenz${withFile.length !== 1 ? 'en' : ''} werden heruntergeladen.`,
              )
            }}
          />

        {referenceLayout === 'table' ? (
          <ReferencesDataTable
            filteredReferences={filteredReferences}
            paginatedReferences={paginatedReferences}
            filteredSelectedCount={filteredSelectedCount}
            selectedRefIds={selectedRefIds}
            setSelectedRefIds={setSelectedRefIds}
            orderedVisibleColumnKeys={orderedVisibleColumnKeys}
            columnWidths={columnWidths}
            onColumnWidthChange={handleColumnWidthChange}
            dragOverColumn={dragOverColumn}
            setDragOverColumn={setDragOverColumn}
            moveColumnOrder={moveColumnOrder}
            filterOptions={filterOptions}
            companyFilter={companyFilter}
            setCompanyFilter={setCompanyFilter}
            companySearch={companySearch}
            setCompanySearch={setCompanySearch}
            tagsFilter={tagsFilter}
            setTagsFilter={setTagsFilter}
            tagsSearch={tagsSearch}
            setTagsSearch={setTagsSearch}
            industryFilter={industryFilter}
            setIndustryFilter={setIndustryFilter}
            industrySearch={industrySearch}
            setIndustrySearch={setIndustrySearch}
            countryFilter={countryFilter}
            setCountryFilter={setCountryFilter}
            countrySearch={countrySearch}
            setCountrySearch={setCountrySearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            projectStatusFilter={projectStatusFilter}
            setProjectStatusFilter={setProjectStatusFilter}
            projectStatusSearch={projectStatusSearch}
            setProjectStatusSearch={setProjectStatusSearch}
            volumeFilter={volumeFilter}
            setVolumeFilter={setVolumeFilter}
            sortKey={sortKey as ReferenceColumnKey | null}
            sortDir={sortDir}
            handleSort={handleSort as (c: ReferenceColumnKey) => void}
            companyLogoById={companyLogoById}
            companyIndustryById={companyIndustryById}
            orgDateDisplayFormat={orgDateDisplayFormat}
            canCreateReference={canCreateReference}
            search={search}
            setNewRefModalOpen={setNewRefModalOpen}
            rowMenuOpenId={rowMenuOpenId}
            setRowMenuOpenId={setRowMenuOpenId}
            openDetail={openDetail}
            toggleCart={toggleCart}
            handleToggleFavorite={handleToggleFavorite}
            copyReferenceShareLink={copyReferenceShareLink}
            handleCopyId={handleCopyId}
            handleDelete={handleDelete}
            pageSize={pageSize}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            pageCount={pageCount}
          />
        ) : (
          <InboxReferencesConceptClient
            references={filteredReferences}
            selectionPool={initialReferences}
            canEdit={userCanEditReference(
              profile.functionRole,
              profile.systemRole,
              profile.capabilities,
            )}
            canDelete={canManageReferencesAsAdmin(profile.systemRole)}
            isSalesView={salesAppView}
            orgDateFmt={normalizeOrgDateDisplayFormat(orgDateDisplayFormat)}
            externalContacts={externalContacts}
            variant="embedded"
          />
        )}
      </div>

      {renderDialogs({
        profile,
        companies,
        contacts,
        externalContacts,
        deletedCount,
      })}
    </div>
  )
}
