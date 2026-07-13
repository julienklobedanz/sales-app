'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  ReferenceRow,
  ReferenceAssetRow,
  DeletedReferenceRow,
} from './actions'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { isSalesAppView, userCanCreateReference } from '@/lib/roles/reference-access'
import { isSystemAdmin, legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import { isReferenceVisibleToSales } from '@/lib/references/sales-reference-visibility'
import { cn } from '@/lib/utils'
import {
  createSharedPortfolio,
  deleteReference,
  getExistingShareForReference,
  getReferenceAssets,
  toggleFavorite,
} from './actions'
import type { Profile } from './dashboard-shell'
import {
  Cancel01Icon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CirclePlus,
  CopyIcon,
  FileDownIcon,
  FileText,
  Filter,
  LinkIcon,
  MoreHorizontal,
  Pencil,
  Send,
  TrendingUp,
  StarIcon,
  Trash2,
  UploadIcon,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
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
import { AccountsToolbarTooltip } from '@/app/dashboard/accounts/components/accounts-toolbar-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ShareLinkDialog } from './overview/share-link-dialog'
import { BulkDeleteReferencesDialog } from './overview/bulk-delete-references-dialog'
import { TrashDialog } from './overview/trash-dialog'
import {
  renderReferenceColumnCell,
  renderReferenceColumnHeader,
  type ReferenceColumnKey,
} from './overview/reference-table-column-renders'
import { ReferencesOverviewBrandfetchSync } from './overview/references-overview-brandfetch-sync'
import { ReferencesBulkActionsBar } from './overview/references-bulk-actions-bar'
import { ReferenceOnboardingEmptyState } from '@/app/dashboard/references/components/reference-onboarding-empty-state'
import { FilterMenuCheckboxOption } from '@/components/table/filter-menu-checkbox-option'
import { TableRowCheckbox } from '@/components/table/table-row-checkbox'
import { TableRowAlign } from '@/components/table/table-row-align'
import { toast } from 'sonner'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import { copyTableRowsSelected } from '@/lib/copy'
import { parseReferenceVolume, type OrgDateDisplayFormat } from '@/lib/format'
import { canViewComplianceReferenceSegment } from '@/lib/references/library/reference-proof-segment-access'
import { MASTER_INDUSTRIES, getIndustryLabelDe, resolveIndustryId } from '@/lib/constants/industries'
import {
  matchesReferenceVolumeFilter,
  type ReferenceVolumeFilter,
} from '@/lib/references/reference-volume-filter'

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

// --- Konstanten & Hilfsfunktionen ---

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  internal_only: 'Intern',
  approved: 'Freigegeben',
  anonymized: 'Anonymisiert',
  /** Kundenfreigabe ausstehend (Epic 10) bzw. Legacy-Status pending – entspricht Badge „Freigabe ausstehend“. */
  approval_pending: 'Freigabe ausstehend',
}

/** Alle Referenzstatus-Optionen im Filter (fest, unabhängig von aktuell geladenen Zeilen). */
const REFERENCE_TABLE_STATUS_FILTERS: readonly string[] = [
  'draft',
  'internal_only',
  'approval_pending',
  'approved',
  'anonymized',
]

function referenceRowShowsApprovalPending(ref: ReferenceRow): boolean {
  if (String(ref.customer_approval_status ?? '').toLowerCase() === 'pending') return true
  return String(ref.status ?? '').toLowerCase() === 'pending'
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  completed: 'Abgeschlossen',
}

/** Spalten-Keys und Standard-Sichtbarkeit (Reihenfolge = Tabellenreihenfolge) */
const COLUMN_KEYS = [
  'company',
  'title',
  'industry',
  'volume_eur',
  'status',
  'project_status',
  'updated_at',
  'tags',
  'country',
  'project_start',
  'project_end',
  'duration_months',
  'created_at',
] as const
const DEFAULT_VISIBLE: Record<(typeof COLUMN_KEYS)[number], boolean> = {
  company: true,
  title: true,
  industry: true,
  volume_eur: false,
  status: true,
  project_status: false,
  updated_at: false,
  tags: false,
  country: false,
  project_start: false,
  project_end: false,
  duration_months: false,
  created_at: false,
}
const COLUMN_LABELS: Record<(typeof COLUMN_KEYS)[number], string> = {
  status: 'Referenzstatus',
  company: 'Account',
  title: 'Titel',
  tags: 'Tags',
  industry: 'Industrie',
  volume_eur: 'Volumen',
  country: 'HQ',
  project_status: 'Projektstatus',
  project_start: 'Projektstart',
  project_end: 'Projektende',
  duration_months: 'Dauer (Monate)',
  created_at: 'Hinzugefügt am',
  updated_at: 'Letzte Änderung',
}

const COLUMN_ORDER_STORAGE_KEY = 'dashboard-overview-column-order-v1'
const COLUMN_VISIBLE_STORAGE_KEY = 'dashboard-overview-column-visible-v1'
const REFERENCE_SHOW_EXPIRED_CERTS_KEY = 'evidence-compliance-show-expired-v1'

function loadVisibleColumnsFromStorage(): Record<(typeof COLUMN_KEYS)[number], boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_VISIBLE }
  try {
    const raw = localStorage.getItem(COLUMN_VISIBLE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_VISIBLE }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_VISIBLE }
    const result = { ...DEFAULT_VISIBLE }
    for (const key of COLUMN_KEYS) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'boolean') {
        result[key] = value
      }
    }
    return result
  } catch {
    return { ...DEFAULT_VISIBLE }
  }
}

function loadColumnOrderFromStorage(): ReferenceColumnKey[] {
  if (typeof window === 'undefined') return [...COLUMN_KEYS] as ReferenceColumnKey[]
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY)
    if (!raw) return [...COLUMN_KEYS] as ReferenceColumnKey[]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...COLUMN_KEYS] as ReferenceColumnKey[]
    const allowed = new Set<string>(COLUMN_KEYS)
    const seen = new Set<string>()
    const result: ReferenceColumnKey[] = []
    for (const item of parsed) {
      if (typeof item === 'string' && allowed.has(item) && !seen.has(item)) {
        seen.add(item)
        result.push(item as ReferenceColumnKey)
      }
    }
    for (const k of COLUMN_KEYS) {
      if (!seen.has(k)) result.push(k as ReferenceColumnKey)
    }
    return result
  } catch {
    return [...COLUMN_KEYS] as ReferenceColumnKey[]
  }
}

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
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof COLUMN_KEYS)[number], boolean>
  >(loadVisibleColumnsFromStorage)
  const [columnOrder, setColumnOrder] = useState<ReferenceColumnKey[]>(() =>
    loadColumnOrderFromStorage()
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

  async function previewBulkImportFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/bulk-import/preview', { method: 'POST', body: formData })
      const json = (await res.json()) as {
        success?: boolean
        projectName?: string
        companyName?: string | null
      }
      if (json.success && json.projectName?.trim()) {
        return {
          projectName: json.projectName.trim(),
          companyName: json.companyName?.trim() || undefined,
        }
      }
    } catch {
      // Vorschau optional — Dateiname als Fallback
    }
    return {
      projectName: file.name.replace(/\.[^.]+$/, '').trim() || file.name,
      companyName: undefined as string | undefined,
    }
  }

  function addBulkImportFiles(newFiles: File[]) {
    setBulkImportGroups((prev) => {
      const currentTotal = prev.reduce((s, g) => s + g.files.length, 0)
      const capped = newFiles.slice(0, Math.max(0, BULK_IMPORT_MAX_FILES - currentTotal))
      if (capped.length === 0) return prev
      const newGroups: BulkImportGroupItem[] = capped.map((file) => ({
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        projectName: file.name.replace(/\.[^.]+$/, '').trim() || file.name,
        files: [file],
      }))
      const next = autoGroupByPrefix([...prev, ...newGroups])

      for (const file of capped) {
        void previewBulkImportFile(file).then((meta) => {
          setBulkImportGroups((current) =>
            current.map((g) => {
              if (!g.files.includes(file)) return g
              return {
                ...g,
                projectName: meta.projectName || g.projectName,
                companyName: meta.companyName ?? g.companyName,
              }
            })
          )
        })
      }

      return next
    })
  }

  function autoGroupByPrefix(groups: BulkImportGroupItem[]): BulkImportGroupItem[] {
    const metaByFile = new Map<File, { projectName: string; companyName?: string }>()
    for (const group of groups) {
      for (const file of group.files) {
        metaByFile.set(file, {
          projectName: group.projectName,
          companyName: group.companyName,
        })
      }
    }

    const byPrefix = new Map<string, File[]>()
    for (const group of groups) {
      for (const file of group.files) {
        const baseName = file.name.replace(/\.[^.]+$/, '').trim()
        const prefix = baseName.includes('_') ? baseName.split('_')[0]!.trim() : baseName || file.name
        if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
        byPrefix.get(prefix)!.push(file)
      }
    }
    const result: BulkImportGroupItem[] = Array.from(byPrefix.entries()).map(
      ([prefix, files]) => {
        const first = files[0]
        const meta = first ? metaByFile.get(first) : undefined
        return {
          id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          projectName:
            meta?.projectName ??
            first?.name.replace(/\.[^.]+$/, '').trim() ??
            prefix ??
            'Referenz',
          companyName: meta?.companyName,
          files,
        }
      }
    )
    const autoGroupedCount = result.filter((g) => g.files.length > 1).reduce((s, g) => s + g.files.length, 0)
    if (autoGroupedCount > 0) {
      toast.info(`${autoGroupedCount} Dateien wurden automatisch gruppiert, da sie zusammenzugehören scheinen.`)
    }
    return result
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

  function moveFileToGroup(
    fromGroupIndex: number,
    fromFileIndex: number,
    toGroupIndex: number
  ) {
    if (fromGroupIndex === toGroupIndex) return
    setBulkImportGroups((prev) => {
      const next = prev.map((g) => ({ ...g, files: [...g.files] }))
      const file = next[fromGroupIndex]?.files[fromFileIndex]
      if (!file) return prev
      next[fromGroupIndex]!.files = next[fromGroupIndex]!.files.filter((_, i) => i !== fromFileIndex)
      const target = next[toGroupIndex]
      if (target) target.files.push(file)
      return next.filter((g) => g.files.length > 0)
    })
  }

  function setBulkImportGroupName(groupId: string, projectName: string) {
    setBulkImportGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, projectName } : g))
    )
  }

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder))
    } catch {
      /* ignore */
    }
  }, [columnOrder])

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

  // Eindeutige Werte für Filter-Dropdowns (aus aktuellen Referenzen)
  const normalizeTagLabel = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    const lower = trimmed.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
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

  const filterOptions = useMemo(() => {
    const countries = new Set<string>()
    const projectStatuses = new Set<string>()
    const companies = new Set<string>()
    const tags = new Set<string>()
    for (const r of initialReferences) {
      if (r.country) countries.add(r.country)
      if (r.project_status) projectStatuses.add(r.project_status)
      if (r.company_name) companies.add(r.company_name)
      if (r.tags) {
        r.tags
          .split(/[\s,]+/)
          .map((t) => normalizeTagLabel(t))
          .filter(Boolean)
          .forEach((t) => tags.add(t))
      }
    }
    return {
      statuses: [...REFERENCE_TABLE_STATUS_FILTERS],
      industries: MASTER_INDUSTRIES.map((item) => item.id),
      countries: Array.from(countries).sort(),
      projectStatuses: Array.from(projectStatuses).sort(),
      companies: Array.from(companies).sort((a, b) => a.localeCompare(b, 'de')),
      tags: Array.from(tags).sort((a, b) => a.localeCompare(b, 'de')),
    }
  }, [initialReferences, companyIndustryById, normalizeTagLabel])

  // Sortier-Hilfe: Vergleichswerte pro Spalte
  const getSortValue = (ref: ReferenceRow, key: (typeof COLUMN_KEYS)[number]): string | number => {
    switch (key) {
      case 'status': return ref.status
      case 'company': return (ref.company_name ?? '').toLowerCase()
      case 'title': return (ref.title ?? '').toLowerCase()
      case 'tags': return (ref.tags ?? '').toLowerCase()
      case 'industry': {
        const raw =
          String(ref.industry ?? '').trim() ||
          (ref.company_id ? companyIndustryById.get(ref.company_id) : '') ||
          ''
        return getIndustryLabelDe(raw).toLowerCase() || raw.toLowerCase()
      }
      case 'volume_eur': {
        const parsed = parseReferenceVolume(ref.volume_eur)
        return parsed ? Number(parsed.amountDigits) : 0
      }
      case 'country': return (ref.country ?? '').toLowerCase()
      case 'project_status': return ref.project_status ?? ''
      case 'project_start': return ref.project_start ? new Date(ref.project_start).getTime() : 0
      case 'project_end': return ref.project_end ? new Date(ref.project_end).getTime() : 0
      case 'duration_months': return ref.duration_months ?? 0
      case 'created_at': return new Date(ref.created_at).getTime()
      case 'updated_at': return ref.updated_at ? new Date(ref.updated_at).getTime() : 0
      default: return ''
    }
  }

  const salesAppView = isSalesAppView(profile.systemRole, profile.functionRole)

  // Client-seitiges Filtering (Sales: draft nie anzeigen; optional nur Favoriten) + Sortierung
  const filteredReferences = useMemo(() => {
    let list = referencesWithLocalFavorites
    if (salesAppView) {
      list = list.filter((r) => isReferenceVisibleToSales(r.status))
    }
    if (favoritesOnly) {
      list = list.filter((r) => r.is_favorited)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.company_name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'approval_pending') {
        list = list.filter(referenceRowShowsApprovalPending)
      } else {
        list = list.filter(
          (r) => r.status === statusFilter && !referenceRowShowsApprovalPending(r)
        )
      }
    }
    if (companyFilter !== 'all') {
      list = list.filter((r) => r.company_name === companyFilter)
    }
    if (tagsFilter !== 'all') {
      list = list.filter((r) => {
        if (!r.tags) return false
        const tagList = r.tags
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
        return tagList.includes(tagsFilter)
      })
    }
    if (industryFilter !== 'all') {
      list = list.filter((r) => {
        const raw =
          String(r.industry ?? '').trim() ||
          (r.company_id ? companyIndustryById.get(r.company_id) : '') ||
          ''
        return resolveIndustryId(raw) === industryFilter
      })
    }
    if (countryFilter !== 'all') {
      list = list.filter((r) => (r.country ?? '') === countryFilter)
    }
    if (projectStatusFilter !== 'all') {
      list = list.filter((r) => (r.project_status ?? '') === projectStatusFilter)
    }
    if (volumeFilter !== 'all') {
      list = list.filter((r) => matchesReferenceVolumeFilter(r.volume_eur, volumeFilter))
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const va = getSortValue(a, sortKey)
        const vb = getSortValue(b, sortKey)
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va
        }
        const sa = String(va)
        const sb = String(vb)
        const cmp = sa.localeCompare(sb, 'de')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [
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
  ])

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
  const selectedCount = selectedRefs.length
  useEffect(() => {
    const el = selectAllCheckboxRef.current
    if (!el) return
    el.indeterminate =
      selectedRefIds.size > 0 &&
      filteredReferences.length > 0 &&
      selectedRefIds.size < filteredReferences.length
  }, [selectedRefIds.size, filteredReferences.length])

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
                if (!open) setBulkImportLoading(false)
                setBulkImportOpen(open)
              }}
              loading={bulkImportLoading}
              onLoadingChange={setBulkImportLoading}
              groups={bulkImportGroups}
              setGroups={setBulkImportGroups}
              dropRef={bulkImportDropRef}
              addFiles={addBulkImportFiles}
              removeFile={removeBulkImportFile}
              moveFileToGroup={moveFileToGroup}
              setGroupName={setBulkImportGroupName}
            />
          </>
        ) : null}
      </>
    )
  }

  return (
    <div className="flex min-w-0 flex-col space-y-5">
      <ReferencesOverviewBrandfetchSync companyIds={companyIdsNeedingBrandfetch} />
      {/* Toolbar & Tabelle */}
      <div className="min-w-0 space-y-2">
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
          <>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32px] align-middle p-2 pr-0">
                  <TableRowCheckbox
                    ref={selectAllCheckboxRef}
                    rowHeight={10}
                    checked={
                      filteredReferences.length > 0 &&
                      filteredReferences.every((r) => selectedRefIds.has(r.id))
                    }
                    onChange={() => {
                      if (
                        filteredReferences.every((r) => selectedRefIds.has(r.id))
                      ) {
                        setSelectedRefIds(new Set())
                      } else {
                        setSelectedRefIds(
                          new Set(filteredReferences.map((r) => r.id))
                        )
                      }
                    }}
                    aria-label="Alle auswählen"
                    disabled={filteredReferences.length === 0}
                  />
                </TableHead>
                {orderedVisibleColumnKeys.map((column) => (
                  <React.Fragment key={column}>
                    {renderReferenceColumnHeader(column, {
                      dragOverColumn,
                      setDragOverColumn,
                      moveColumnOrder,
                      COLUMN_LABELS: COLUMN_LABELS as Record<ReferenceColumnKey, string>,
                      STATUS_LABELS,
                      filterOptions,
                      companyFilter,
                      setCompanyFilter,
                      companySearch,
                      setCompanySearch,
                      tagsFilter,
                      setTagsFilter,
                      tagsSearch,
                      setTagsSearch,
                      industryFilter,
                      setIndustryFilter,
                      industrySearch,
                      setIndustrySearch,
                      countryFilter,
                      setCountryFilter,
                      countrySearch,
                      setCountrySearch,
                      statusFilter,
                      setStatusFilter,
                      projectStatusFilter,
                      setProjectStatusFilter,
                      projectStatusSearch,
                      setProjectStatusSearch,
                      volumeFilter,
                      setVolumeFilter,
                      sortKey: sortKey as ReferenceColumnKey | null,
                      sortDir,
                      handleSort: handleSort as (c: ReferenceColumnKey) => void,
                    })}
                  </React.Fragment>
                ))}
                <TableHead className="sticky right-0 z-10 w-[44px] min-w-[44px] bg-card p-2 text-right shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.12)]">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={orderedVisibleColumnKeys.length + 2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 py-2">
                      <p>Keine Referenzen gefunden.</p>
                      {!search.trim() &&
                        isSystemAdmin(profile.systemRole) && (
                          <Button
                            className="mt-1"
                            onClick={() => setNewRefModalOpen(true)}
                          >
                            Erstelle eine Referenz
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReferences.map((ref) => (
                  <TableRow
                    key={ref.id}
                    className="group cursor-pointer hover:bg-accent/35"
                    onClick={() => openDetail(ref)}
                    onContextMenu={(e: React.MouseEvent) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setRowMenuOpenId(ref.id)
                    }}
                  >
                    <TableCell
                      className="w-[32px] align-middle p-2 pr-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableRowCheckbox
                        checked={selectedRefIds.has(ref.id)}
                        onChange={() => toggleCart(ref.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${ref.title} in Warenkorb`}
                      />
                    </TableCell>
                    {orderedVisibleColumnKeys.map((column) => (
                      <React.Fragment key={column}>
                        {renderReferenceColumnCell(column, ref, {
                          PROJECT_STATUS_LABELS,
                          companyLogoById,
                          companyIndustryById,
                          orgDateDisplayFormat,
                        })}
                      </React.Fragment>
                    ))}
                    <TableCell
                      className="sticky right-0 z-10 w-[44px] min-w-[44px] bg-card align-middle p-2 text-right shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.12)] group-hover:bg-accent/35"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <TableRowAlign className="justify-end">
                        <DropdownMenu
                          open={rowMenuOpenId === ref.id}
                          onOpenChange={(open) => setRowMenuOpenId(open ? ref.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 shrink-0 p-0"
                              aria-label="Aktionen"
                            >
                              <AppIcon icon={MoreHorizontal} size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                void handleToggleFavorite(
                                  ref.id,
                                  e as unknown as React.MouseEvent
                                )
                              }}
                            >
                              <AppIcon
                                icon={StarIcon}
                                size={16}
                                className={`mr-2 ${ref.is_favorited ? 'text-amber-500' : ''}`}
                              />
                              {ref.is_favorited ? 'Favorit entfernen' : 'Als Favorit markieren'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                void copyReferenceShareLink(ref.id)
                              }}
                            >
                              <AppIcon icon={LinkIcon} size={16} className="mr-2" />
                              Kundenlink kopieren
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => openDetail(ref)}>
                              <AppIcon icon={FileText} size={16} className="mr-2" />
                              Details ansehen
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => router.push(ROUTES.references.edit(ref.id))}
                            >
                              <AppIcon icon={Pencil} size={16} className="mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e: Event) =>
                                handleCopyId(
                                  ref.id,
                                  e as unknown as React.MouseEvent
                                )
                              }
                            >
                              <AppIcon icon={CopyIcon} size={16} className="mr-2" />
                              ID kopieren
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e: Event) => {
                                handleDelete(
                                  ref.id,
                                  e as unknown as React.MouseEvent
                                )
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <AppIcon icon={Trash2} size={16} className="mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableRowAlign>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {copyTableRowsSelected(filteredSelectedCount, filteredReferences.length)}
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{COPY.table.rowsPerPage}</p>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPageIndex(0)
                }}
              >
                <SelectTrigger size="sm" className="h-8 w-[88px] rounded-lg border-border/70 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 30, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[126px] items-center justify-center text-sm font-medium text-muted-foreground">
              Seite {pageIndex + 1} von {pageCount}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex <= 0}
                aria-label="Zur ersten Seite"
              >
                <AppIcon icon={ChevronsLeft} size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-muted/70"
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={pageIndex <= 0}
                aria-label="Zur vorherigen Seite"
              >
                <AppIcon icon={ChevronLeft} size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-muted/70"
                onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                disabled={pageIndex >= pageCount - 1}
                aria-label="Zur nächsten Seite"
              >
                <AppIcon icon={ChevronRight} size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={pageIndex >= pageCount - 1}
                aria-label="Zur letzten Seite"
              >
                <AppIcon icon={ChevronsRight} size={16} />
              </Button>
            </div>
          </div>
        </div>
          </>
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
            if (!open) setBulkImportLoading(false)
            setBulkImportOpen(open)
          }}
          loading={bulkImportLoading}
          onLoadingChange={setBulkImportLoading}
          groups={bulkImportGroups}
          setGroups={setBulkImportGroups}
          dropRef={bulkImportDropRef}
          addFiles={addBulkImportFiles}
          removeFile={removeBulkImportFile}
          moveFileToGroup={moveFileToGroup}
          setGroupName={setBulkImportGroupName}
        />
      )}
    </div>
  )
}
