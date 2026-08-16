'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReferenceRow } from './actions'
import { ROUTES } from '@/lib/routes'
import { isSalesAppView, userCanCreateReference } from '@/lib/roles/reference-access'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { deleteReference, toggleFavorite } from './actions'
import type { Profile } from './dashboard-types'
import { ReferenceLibraryToolbar } from './overview/reference-library-toolbar'
import type { ReferenceLayoutMode } from './overview/reference-layout-switch'
import { SmartMatchShell } from './smart-match/smart-match-shell'
import { ComplianceDocumentsTable } from './overview/compliance-documents-table'
import {
  REFERENCE_LIBRARY_MODE_STORAGE_KEY,
  type ReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode'
import {
  setReferenceLibraryModeOptimistic,
  syncReferenceLibraryModeFromStorage,
  useReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode-store'
import type { ComplianceDocumentRow } from '@/app/dashboard/settings/compliance-actions'
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  REFERENCE_SHOW_EXPIRED_CERTS_KEY,
  STATUS_LABELS,
  loadShowExpiredCertificatesFromStorage,
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
import { useReferenceDetailSheet } from './overview/use-reference-detail-sheet'
import { useReferenceOverviewColumns } from './overview/use-reference-overview-columns'
import { useReferencesOverviewDialogsState } from './overview/use-references-overview-dialogs-state'
import { ReferenceOnboardingEmptyState } from '@/app/dashboard/references/components/reference-onboarding-empty-state'
import { toast } from 'sonner'
import type { OrgDateDisplayFormat } from '@/lib/format'
import { canViewComplianceReferenceSegment } from '@/lib/references/library/reference-proof-segment-access'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'

const InboxReferencesConceptClient = dynamic(
  () =>
    import('@/app/dashboard/overview/inbox-references/client').then((m) => ({
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

const ReferenceDetailSheet = dynamic(
  () =>
    import('./overview/reference-detail-sheet').then((m) => ({
      default: m.ReferenceDetailSheet,
    })),
  { ssr: false, loading: () => null },
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
  complianceDocuments = [],
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
  complianceDocuments?: ComplianceDocumentRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [certificateSearch, setCertificateSearch] = useState('')
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
  const [sortKey, setSortKey] = useState<(typeof COLUMN_KEYS)[number] | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly)
  const [listMode, setListMode] = useState<'table' | 'inbox'>('table')
  const wantMatch = searchParams.get('view') === 'match'
  const referenceLayout: ReferenceLayoutMode = wantMatch ? 'match' : listMode
  const libraryMode = useReferenceLibraryMode()
  const [showExpiredCertificates, setShowExpiredCertificates] = useState(() =>
    loadShowExpiredCertificatesFromStorage(),
  )
  const isReferencesLibrary = libraryMode === 'references'
  const isCertificatesLibrary = libraryMode === 'certificates'
  const canViewComplianceSegment = canViewComplianceReferenceSegment(
    profile.systemRole,
    profile.functionRole,
  )
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null)
  const {
    selectedRef,
    setSelectedRef,
    sheetOpen,
    setSheetOpen,
    detailAssets,
    setDetailAssets,
    detailAssetsLoading,
    handleReferenceSheetOpenChange,
  } = useReferenceDetailSheet()
  const {
    setComplianceUploadOpen,
    setComplianceBulkUploadOpen,
    setBulkImportOpen,
    setBulkImportGroups,
    addBulkImportFiles,
    setNewRefModalOpen,
    setShareLinkPopoverRef,
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
    resetVisibleColumns,
    orderedVisibleColumnKeys,
    moveColumnOrder,
  } = useReferenceOverviewColumns()

  useLayoutEffect(() => {
    syncReferenceLibraryModeFromStorage()
  }, [])

  const handleLibraryModeChange = useCallback((mode: ReferenceLibraryMode) => {
    setReferenceLibraryModeOptimistic(mode)
  }, [])

  const handleReferenceLayoutChange = useCallback(
    (mode: ReferenceLayoutMode) => {
      const next = new URLSearchParams(searchParams.toString())
      if (mode === 'match') {
        next.set('view', 'match')
      } else {
        if (!wantMatch) setListMode(mode)
        next.delete('view')
      }
      const qs = next.toString()
      router.replace(qs ? `?${qs}` : '?', { scroll: false })
    },
    [router, searchParams, wantMatch],
  )

  useEffect(() => {
    if (!canViewComplianceSegment && libraryMode === 'certificates') {
      setReferenceLibraryModeOptimistic('references')
    }
  }, [canViewComplianceSegment, libraryMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(REFERENCE_LIBRARY_MODE_STORAGE_KEY, libraryMode)
    } catch {
      /* ignore */
    }
  }, [libraryMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        REFERENCE_SHOW_EXPIRED_CERTS_KEY,
        showExpiredCertificates ? '1' : '0',
      )
    } catch {
      /* ignore */
    }
  }, [showExpiredCertificates])

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
    router.push(ROUTES.references.detail(ref.id))
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
        setSheetOpen(false)
        setSelectedRef(null)
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
    isReferencesLibrary &&
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
          onCreateManual={isAdmin ? () => setNewRefModalOpen(true) : undefined}
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
          libraryMode={libraryMode}
          onLibraryModeChange={handleLibraryModeChange}
          showProofSegmentSwitch={canViewComplianceSegment}
          referenceLayout={referenceLayout}
          onReferenceLayoutChange={handleReferenceLayoutChange}
          searchValue={isReferencesLibrary ? search : certificateSearch}
          onSearchChange={isReferencesLibrary ? setSearch : setCertificateSearch}
          isAdmin={isSystemAdmin(profile.systemRole)}
          favoritesOnly={favoritesOnly}
          onFavoritesOnlyChange={setFavoritesOnly}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          volumeFilter={volumeFilter}
          onVolumeFilterChange={setVolumeFilter}
          statusOptions={filterOptions.statuses}
          statusLabels={STATUS_LABELS}
          columnOrder={columnOrder}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onResetVisibleColumns={resetVisibleColumns}
          columnLabels={COLUMN_LABELS}
          onImportClick={() => {
            setBulkImportGroups([])
            setBulkImportOpen(true)
          }}
          onCreateReferenceClick={() => setNewRefModalOpen(true)}
          onUploadCertificateClick={() => setComplianceUploadOpen(true)}
          onBulkUploadCertificatesClick={
            isSystemAdmin(profile.systemRole)
              ? () => setComplianceBulkUploadOpen(true)
              : undefined
          }
          showExpiredCertificates={showExpiredCertificates}
          onShowExpiredCertificatesChange={setShowExpiredCertificates}
        />

        {isReferencesLibrary && referenceLayout !== 'match' ? (
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
        ) : null}

        {isCertificatesLibrary ? (
          <ComplianceDocumentsTable
            documents={complianceDocuments}
            search={certificateSearch}
            showExpired={showExpiredCertificates}
            isAdmin={isSystemAdmin(profile.systemRole)}
            onUploadClick={() => setComplianceUploadOpen(true)}
          />
        ) : referenceLayout === 'match' ? (
          <div className="min-h-[28rem]">
            <SmartMatchShell deals={[]} initialDealId={null} variant="embedded" />
          </div>
        ) : referenceLayout === 'table' ? (
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
            profile={profile}
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
            isAdmin={isSystemAdmin(profile.systemRole)}
            externalContacts={externalContacts}
            variant="embedded"
          />
        )}
      </div>

      <ReferenceDetailSheet
        open={sheetOpen}
        onOpenChange={handleReferenceSheetOpenChange}
        selectedRef={selectedRef}
        profile={profile}
        externalContacts={externalContacts}
        detailAssets={detailAssets}
        detailAssetsLoading={detailAssetsLoading}
        setDetailAssets={setDetailAssets}
        normalizeTagLabel={normalizeTagLabel}
        onToggleFavorite={handleToggleFavorite}
        onOpenShareLink={setShareLinkPopoverRef}
        onDelete={handleDelete}
        orgDateDisplayFormat={orgDateDisplayFormat}
      />

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
