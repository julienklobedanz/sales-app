'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type {
  ReferenceRow,
  ReferenceAssetRow,
  DeletedReferenceRow,
} from './actions'
import { ROUTES } from '@/lib/routes'
import { isSalesAppView, userCanCreateReference } from '@/lib/roles/reference-access'
import { isSystemAdmin, legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import {
  createSharedPortfolio,
  deleteReference,
  getExistingShareForReference,
  getReferenceAssets,
  toggleFavorite,
} from './actions'
import type { Profile } from './dashboard-types'
import { BulkImportDialog, type BulkImportGroupItem } from './overview/bulk-import-dialog'
import { ReferenceLibraryToolbar } from './overview/reference-library-toolbar'
import { ComplianceDocumentsTable } from './overview/compliance-documents-table'
import { ComplianceBulkUploadDialog } from './overview/compliance-bulk-upload-dialog'
import { ComplianceUploadDialog } from './overview/compliance-upload-dialog'
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
import { NewReferenceDialog } from './overview/new-reference-dialog'
import { ShareLinkDialog } from './overview/share-link-dialog'
import { BulkDeleteReferencesDialog } from './overview/bulk-delete-references-dialog'
import { TrashDialog } from './overview/trash-dialog'
import {
  type ReferenceColumnKey,
} from './overview/reference-table-column-renders'
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  COLUMN_ORDER_STORAGE_KEY,
  COLUMN_SIZING_STORAGE_KEY,
  COLUMN_VISIBLE_STORAGE_KEY,
  DEFAULT_VISIBLE,
  REFERENCE_SHOW_EXPIRED_CERTS_KEY,
  STATUS_LABELS,
  loadColumnOrderFromStorage,
  loadReferenceColumnWidthsFromStorage,
  loadVisibleColumnsFromStorage,
} from './overview/reference-overview-columns'
import {
  buildReferenceFilterOptions,
  filterAndSortReferences,
  normalizeTagLabel,
} from './overview/filter-sort-references'
import { ReferencesDataTable } from './overview/references-data-table'
import { addBulkImportFiles as addBulkImportFilesHelper } from './overview/bulk-import-file-helpers'
import { ReferencesOverviewBrandfetchSync } from './overview/references-overview-brandfetch-sync'
import { ReferencesBulkActionsBar } from './overview/references-bulk-actions-bar'
import { ReferenceOnboardingEmptyState } from '@/app/dashboard/references/components/reference-onboarding-empty-state'
import { toast } from 'sonner'
import {
  clampColumnWidth,
  saveColumnWidthsToStorage,
} from '@/lib/table-column-sizing'
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
  }
)

const ReferenceDetailSheet = dynamic(
  () =>
    import('./overview/reference-detail-sheet').then((m) => ({
      default: m.ReferenceDetailSheet,
    })),
  { ssr: false, loading: () => null }
)

// --- Hauptkomponente ---

type CompanyOption = {
  id: string
  name: string
  logo_url?: string | null
  industry?: string | null
}
type ContactOption = { id: string; first_name: string | null; last_name: string | null; email: string | null }

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
  externalContacts?: { id: string; company_id: string; first_name: string | null; last_name: string | null; email: string | null; role: string | null; phone?: string | null }[]
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
  const [referenceLayout, setReferenceLayout] = useState<'inbox' | 'table'>('table')
  const libraryMode = useReferenceLibraryMode()
  const [complianceUploadOpen, setComplianceUploadOpen] = useState(false)
  const [complianceBulkUploadOpen, setComplianceBulkUploadOpen] = useState(false)
  const [showExpiredCertificates, setShowExpiredCertificates] = useState(false)
  const isReferencesLibrary = libraryMode === 'references'
  const isCertificatesLibrary = libraryMode === 'certificates'
  const canViewComplianceSegment = canViewComplianceReferenceSegment(
    profile.systemRole,
    profile.functionRole
  )
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null)
  const [selectedRef, setSelectedRef] = useState<ReferenceRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailAssets, setDetailAssets] = useState<ReferenceAssetRow[]>([])
  const [detailAssetsLoading, setDetailAssetsLoading] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportGroups, setBulkImportGroups] = useState<BulkImportGroupItem[]>([])
  const [bulkImportLoading, setBulkImportLoading] = useState(false)
  const [bulkImportPreviewPendingFiles, setBulkImportPreviewPendingFiles] = useState<Set<File>>(
    () => new Set()
  )
  const bulkImportDropRef = useRef<HTMLInputElement>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashItems, setTrashItems] = useState<DeletedReferenceRow[]>([])
  /** Papierkorb-Laden: aktuell kein Öffnen-Pfad; Dialog bleibt ohne Spinner bis Anbindung. */
  const trashLoading = false
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
  const [newRefModalOpen, setNewRefModalOpen] = useState(false)
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(() => new Set())
  const [pageSize, setPageSize] = useState(30)
  const [pageIndex, setPageIndex] = useState(0)
  const [shareLinkPopoverRef, setShareLinkPopoverRef] = useState<ReferenceRow | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof COLUMN_KEYS)[number], boolean>
  >(loadVisibleColumnsFromStorage)
  const [columnOrder, setColumnOrder] = useState<ReferenceColumnKey[]>(() =>
    loadColumnOrderFromStorage()
  )
  const [columnWidths, setColumnWidths] = useState<Record<ReferenceColumnKey, number>>(
    () => loadReferenceColumnWidthsFromStorage()
  )
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const handleReferenceSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setDetailAssets([])
      setDetailAssetsLoading(false)
    }
  }, [])

  useLayoutEffect(() => {
    syncReferenceLibraryModeFromStorage()
    try {
      setShowExpiredCertificates(localStorage.getItem(REFERENCE_SHOW_EXPIRED_CERTS_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const handleLibraryModeChange = useCallback((mode: ReferenceLibraryMode) => {
    setReferenceLibraryModeOptimistic(mode)
  }, [])

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
        showExpiredCertificates ? '1' : '0'
      )
    } catch {
      /* ignore */
    }
  }, [showExpiredCertificates])

  useEffect(() => {
    if (!selectedRef?.id || !sheetOpen) return
    let cancelled = false
    void (async () => {
      setDetailAssetsLoading(true)
      try {
        const assets = await getReferenceAssets(selectedRef.id)
        if (!cancelled) setDetailAssets(assets)
      } finally {
        if (!cancelled) setDetailAssetsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedRef?.id, sheetOpen])

  function addBulkImportFiles(newFiles: File[]) {
    addBulkImportFilesHelper(
      newFiles,
      setBulkImportGroups,
      setBulkImportPreviewPendingFiles
    )
  }

  function removeBulkImportFile(groupId: string, fileIndex: number) {
    setBulkImportGroups((prev) =>
      prev
        .map((g) =>
          g.id === groupId
            ? { ...g, files: g.files.filter((_, i) => i !== fileIndex) }
            : g
        )
        .filter((g) => g.files.length > 0)
    )
  }

  function moveBulkImportFile(fromGroupId: string, fileIndex: number, toGroupId: string) {
    if (fromGroupId === toGroupId) return
    setBulkImportGroups((prev) => {
      const sourceGroup = prev.find((g) => g.id === fromGroupId)
      const file = sourceGroup?.files[fileIndex]
      if (!sourceGroup || !file) return prev
      if (!prev.some((g) => g.id === toGroupId)) return prev

      return prev
        .map((g) => {
          if (g.id === fromGroupId) {
            return { ...g, files: g.files.filter((_, i) => i !== fileIndex) }
          }
          if (g.id === toGroupId) {
            return { ...g, files: [...g.files, file] }
          }
          return g
        })
        .filter((g) => g.files.length > 0)
    })
  }

  function setBulkImportGroupName(groupId: string, projectName: string) {
    setBulkImportGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, projectName } : g))
    )
  }

  function setBulkImportCompanyName(groupId: string, companyName: string) {
    setBulkImportGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, companyName: companyName.trim() || undefined } : g))
    )
  }

  function mergeBulkImportGroups(selectedIds: string[]) {
    if (selectedIds.length < 2) return
    setBulkImportGroups((prev) => {
      const idSet = new Set(selectedIds)
      const selected = prev.filter((g) => idSet.has(g.id))
      if (selected.length < 2) return prev
      const rest = prev.filter((g) => !idSet.has(g.id))
      const primary = selected[0]!
      const mergedCompany =
        primary.companyName?.trim() ||
        selected.find((g) => g.companyName?.trim())?.companyName?.trim()
      return [
        ...rest,
        {
          ...primary,
          companyName: mergedCompany || undefined,
          files: selected.flatMap((g) => g.files),
        },
      ]
    })
  }

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder))
    } catch {
      /* ignore */
    }
  }, [columnOrder])

  useEffect(() => {
    saveColumnWidthsToStorage(COLUMN_SIZING_STORAGE_KEY, columnWidths)
  }, [columnWidths])

  const handleColumnWidthChange = useCallback((column: ReferenceColumnKey, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column]: clampColumnWidth(width),
    }))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_VISIBLE_STORAGE_KEY, JSON.stringify(visibleColumns))
    } catch {
      /* ignore */
    }
  }, [visibleColumns])

  const resetVisibleColumns = useCallback(() => {
    setVisibleColumns({ ...DEFAULT_VISIBLE })
  }, [])

  const orderedVisibleColumnKeys = useMemo(
    () => columnOrder.filter((k) => visibleColumns[k]),
    [columnOrder, visibleColumns]
  )

  const moveColumnOrder = useCallback((from: string, to: string) => {
    if (from === to) return
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== from)
      const insertAt = next.indexOf(to as ReferenceColumnKey)
      if (insertAt === -1) return prev
      next.splice(insertAt, 0, from as ReferenceColumnKey)
      return next
    })
  }, [])

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
      }
    )
  }

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialReferences.filter((r) => r.is_favorited).map((r) => r.id))
  )

  const referencesWithLocalFavorites = useMemo(
    () =>
      initialReferences.map((r) => ({
        ...r,
        is_favorited: favoriteIds.has(r.id),
      })),
    [initialReferences, favoriteIds]
  )

  const companyLogoById = useMemo(() => {
    const map = new Map<string, string>()
    for (const company of companies) {
      const url = String(company.logo_url ?? '').trim()
      if (url) map.set(company.id, url)
    }
    for (const ref of initialReferences) {
      if (!ref.company_id) continue
      const url = String(ref.company_logo_url ?? '').trim()
      if (url && !map.has(ref.company_id)) map.set(ref.company_id, url)
    }
    return map
  }, [companies, initialReferences])

  const companyIndustryById = useMemo(() => {
    const map = new Map<string, string>()
    for (const company of companies) {
      const industry = String(company.industry ?? '').trim()
      if (industry) map.set(company.id, industry)
    }
    return map
  }, [companies])

  const companyIdsNeedingBrandfetch = useMemo(() => {
    const ids = new Set<string>()
    for (const ref of initialReferences) {
      if (!ref.company_id) continue
      const hasLogo =
        Boolean(String(ref.company_logo_url ?? '').trim()) ||
        Boolean(String(companies.find((c) => c.id === ref.company_id)?.logo_url ?? '').trim())
      const hasIndustry =
        Boolean(String(ref.industry ?? '').trim()) ||
        companyIndustryById.has(ref.company_id)
      if (!hasLogo || !hasIndustry) ids.add(ref.company_id)
    }
    return [...ids]
  }, [initialReferences, companies, companyIndustryById])

  const filterOptions = useMemo(
    () =>
      buildReferenceFilterOptions(
        initialReferences,
        companyIndustryById,
        normalizeTagLabel
      ),
    [initialReferences, companyIndustryById]
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
    ]
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
    [initialReferences, selectedRefIds]
  )
  const filteredSelectedCount = useMemo(
    () => filteredReferences.filter((r) => selectedRefIds.has(r.id)).length,
    [filteredReferences, selectedRefIds]
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

  async function copyReferenceShareLink(referenceId: string) {
    const existing = await getExistingShareForReference(referenceId)
    let shareUrl = existing?.url ?? null
    if (!shareUrl) {
      const created = await createSharedPortfolio([referenceId])
      if (!created.success) {
        toast.error(created.error ?? 'Kundenlink konnte nicht erstellt werden.')
        return
      }
      shareUrl = created.url
    }
    const absoluteUrl =
      shareUrl.startsWith('http://') || shareUrl.startsWith('https://')
        ? shareUrl
        : new URL(shareUrl, window.location.origin).toString()
    await navigator.clipboard.writeText(absoluteUrl)
    toast.success('Kundenlink kopiert.')
  }

  const canCreateReference = userCanCreateReference(
    profile.functionRole,
    profile.systemRole,
    profile.capabilities
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
        toast.info('Bulk-Import ist nur für Admins verfügbar. Nutze „Ref. manuell erstellen“.')
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
        {isAdmin ? (
          <>
            <NewReferenceDialog
              open={newRefModalOpen}
              onOpenChange={setNewRefModalOpen}
              companies={companies}
              contacts={contacts}
              externalContacts={externalContacts}
            />
            <BulkImportDialog
              open={bulkImportOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setBulkImportLoading(false)
                  setBulkImportPreviewPendingFiles(new Set())
                }
                setBulkImportOpen(open)
              }}
              loading={bulkImportLoading}
              onLoadingChange={setBulkImportLoading}
              groups={bulkImportGroups}
              setGroups={setBulkImportGroups}
              dropRef={bulkImportDropRef}
              addFiles={addBulkImportFiles}
              removeFile={removeBulkImportFile}
              moveFile={moveBulkImportFile}
              setGroupName={setBulkImportGroupName}
              setCompanyName={setBulkImportCompanyName}
              mergeSelectedGroups={mergeBulkImportGroups}
              previewPendingFiles={bulkImportPreviewPendingFiles}
            />
          </>
        ) : null}
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
          onReferenceLayoutChange={setReferenceLayout}
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
            isSystemAdmin(profile.systemRole) ? () => setComplianceBulkUploadOpen(true) : undefined
          }
          showExpiredCertificates={showExpiredCertificates}
          onShowExpiredCertificatesChange={setShowExpiredCertificates}
        />

        {isReferencesLibrary ? (
          <ReferencesBulkActionsBar
            selectedCount={selectedRefIds.size}
            showSalesActions={salesAppView}
            showAdminDelete={isSystemAdmin(profile.systemRole)}
            onClearSelection={() => setSelectedRefIds(new Set())}
            onBulkDelete={() => setBulkDeleteConfirmOpen(true)}
            onCreateSharedPortfolio={async () => {
              const selected = Array.from(selectedRefIds)
              const result = await createSharedPortfolio(selected)
              if (!result.success) {
                toast.error(result.error ?? 'Kollektions-Link konnte nicht erstellt werden.')
                return
              }
              const absoluteUrl =
                result.url.startsWith('http://') || result.url.startsWith('https://')
                  ? result.url
                  : new URL(result.url, window.location.origin).toString()
              await navigator.clipboard.writeText(absoluteUrl)
              toast.success('Kollektions-Link erstellt und kopiert.')
            }}
            onDownloadPdfs={() => {
              const base = process.env.NEXT_PUBLIC_SUPABASE_URL
              const withFile = selectedRefs.filter((r) => r.file_path)
              if (withFile.length === 0) {
                toast.error('Keine der ausgewählten Referenzen hat ein Dokument zum Herunterladen.')
                return
              }
              withFile.forEach((r) => {
                const url = `${base}/storage/v1/object/public/references/${r.file_path}`
                window.open(url, '_blank', 'noopener,noreferrer')
              })
              toast.success(
                `${withFile.length} Referenz${withFile.length !== 1 ? 'en' : ''} werden heruntergeladen.`
              )
            }}
          />
        ) : null}

          {isSystemAdmin(profile.systemRole) && (
            <BulkDeleteReferencesDialog
              open={bulkDeleteConfirmOpen}
              onOpenChange={setBulkDeleteConfirmOpen}
              ids={Array.from(selectedRefIds)}
              loading={bulkDeleteLoading}
              onLoadingChange={setBulkDeleteLoading}
              onSuccess={() => {
                setSelectedRefIds(new Set())
                setBulkDeleteConfirmOpen(false)
              }}
            />
          )}

        {isCertificatesLibrary ? (
          <ComplianceDocumentsTable
            documents={complianceDocuments}
            search={certificateSearch}
            showExpired={showExpiredCertificates}
            isAdmin={isSystemAdmin(profile.systemRole)}
            onUploadClick={() => setComplianceUploadOpen(true)}
          />
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
            profileRole={legacyAppRoleFrom(profile.systemRole, profile.functionRole)}
            externalContacts={externalContacts}
            variant="embedded"
          />
        )}
      </div>

      <TrashDialog
        open={trashOpen}
        onOpenChange={(open) => {
          setTrashOpen(open)
          if (!open) {
            setTrashItems([])
          }
        }}
        deletedCount={deletedCount}
        trashLoading={trashLoading}
        trashItems={trashItems}
        setTrashItems={setTrashItems}
        confirmEmptyOpen={confirmEmptyOpen}
        setConfirmEmptyOpen={setConfirmEmptyOpen}
        emptyingTrash={emptyingTrash}
        setEmptyingTrash={setEmptyingTrash}
      />

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

      <ShareLinkDialog
        reference={shareLinkPopoverRef}
        onClose={() => setShareLinkPopoverRef(null)}
      />

      {isSystemAdmin(profile.systemRole) && (
        <NewReferenceDialog
          open={newRefModalOpen}
          onOpenChange={setNewRefModalOpen}
          companies={companies}
          contacts={contacts}
          externalContacts={externalContacts}
        />
      )}

      {/* Bulk-Import-Modal (nur Admin) */}
      {isSystemAdmin(profile.systemRole) && (
        <ComplianceUploadDialog
          open={complianceUploadOpen}
          onOpenChange={setComplianceUploadOpen}
        />
      )}

      {isSystemAdmin(profile.systemRole) && (
        <ComplianceBulkUploadDialog
          open={complianceBulkUploadOpen}
          onOpenChange={setComplianceBulkUploadOpen}
        />
      )}

      {isSystemAdmin(profile.systemRole) && (
        <BulkImportDialog
          open={bulkImportOpen}
          onOpenChange={(open) => {
            if (!open) {
              setBulkImportLoading(false)
              setBulkImportPreviewPendingFiles(new Set())
            }
            setBulkImportOpen(open)
          }}
          loading={bulkImportLoading}
          onLoadingChange={setBulkImportLoading}
          groups={bulkImportGroups}
          setGroups={setBulkImportGroups}
          dropRef={bulkImportDropRef}
          addFiles={addBulkImportFiles}
          removeFile={removeBulkImportFile}
          moveFile={moveBulkImportFile}
          setGroupName={setBulkImportGroupName}
          setCompanyName={setBulkImportCompanyName}
          mergeSelectedGroups={mergeBulkImportGroups}
          previewPendingFiles={bulkImportPreviewPendingFiles}
        />
      )}
    </div>
  )
}
