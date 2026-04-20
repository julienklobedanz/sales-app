'use client'

import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  PendingClientApprovalRow,
} from './actions'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { TABLE_TOOLBAR } from '@/lib/table-toolbar'
import { cn } from '@/lib/utils'
import { formatDateUtcDe } from '@/lib/format'
import {
  deleteReference,
  getReferenceAssets,
  resendClientApprovalEmail,
  submitForApproval,
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
  Eye,
  FileDownIcon,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Send,
  SlidersHorizontal,
  StarIcon,
  Trash2,
  UploadIcon,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { BulkImportDialog, type BulkImportGroupItem } from './overview/bulk-import-dialog'
import { NewReferenceDialog } from './overview/new-reference-dialog'
import { ReferencePreviewDialog } from './overview/reference-preview-dialog'
import { ShareLinkDialog } from './overview/share-link-dialog'
import { BulkDeleteReferencesDialog } from './overview/bulk-delete-references-dialog'
import { TrashDialog } from './overview/trash-dialog'
import {
  renderReferenceColumnCell,
  renderReferenceColumnHeader,
  type ReferenceColumnKey,
} from './overview/reference-table-column-renders'
import { ReferenceDetailSheet } from './overview/reference-detail-sheet'
import { toast } from 'sonner'
import { copyTableRowsSelected } from '@/lib/copy'
// --- Konstanten & Hilfsfunktionen ---

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  internal_only: 'Intern',
  approved: 'Freigegeben',
  anonymized: 'Anonymisiert',
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
  country: 'HQ',
  project_status: 'Projektstatus',
  project_start: 'Projektstart',
  project_end: 'Projektende',
  duration_months: 'Dauer (Monate)',
  created_at: 'Hinzugefügt am',
  updated_at: 'Letzte Änderung',
}

const COLUMN_ORDER_STORAGE_KEY = 'dashboard-overview-column-order-v1'

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

/** Toolbar: Favoriten / Status / Spalten – gleiche Mindestbreite */
const toolbarSegmentClass = `${TABLE_TOOLBAR.dashboard.toolbarButton} justify-center`

// --- Hauptkomponente ---

type CompanyOption = { id: string; name: string; logo_url?: string | null }
type ContactOption = { id: string; first_name: string | null; last_name: string | null; email: string | null }
type DealOption = { id: string; title: string }

type RfpAnalyzeResponse =
  | {
      success: true
      analysisId: string
      coverage: Array<{
        requirementId: string
        matches: Array<{ id: string; similarity: number }>
      }>
    }
  | { success: false; error?: string }

export function DashboardOverview({
  references: initialReferences,
  deletedCount,
  profile,
  initialFavoritesOnly = false,
  initialStatusFilter = 'all',
  companies = [],
  contacts = [],
  externalContacts = [],
  deals = [],
  pendingClientApprovals = [],
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
  deals?: DealOption[]
  /** Kunden-Freigabe ausstehend (E-Mail-Link) – Epic 10 */
  pendingClientApprovals?: PendingClientApprovalRow[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter)
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [tagsFilter, setTagsFilter] = useState<string>('all')
  const [industryFilter, setIndustryFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all')
  const [statusSearch, setStatusSearch] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [tagsSearch, setTagsSearch] = useState('')
  const [industrySearch, setIndustrySearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [projectStatusSearch, setProjectStatusSearch] = useState('')
  const [sortKey, setSortKey] = useState<(typeof COLUMN_KEYS)[number] | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly)
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null)
  const [selectedRef, setSelectedRef] = useState<ReferenceRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailAssets, setDetailAssets] = useState<ReferenceAssetRow[]>([])
  const [detailAssetsLoading, setDetailAssetsLoading] = useState(false)
  useEffect(() => {
    if (selectedRef?.id && sheetOpen) {
      setDetailAssetsLoading(true)
      getReferenceAssets(selectedRef.id)
        .then(setDetailAssets)
        .finally(() => setDetailAssetsLoading(false))
    } else {
      setDetailAssets([])
    }
  }, [selectedRef?.id, sheetOpen])
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
  const rfpInputRef = useRef<HTMLInputElement | null>(null)
  const [rfpModalOpen, setRfpModalOpen] = useState(false)
  const [rfpAnalyzing, setRfpAnalyzing] = useState(false)
  const [rfpFile, setRfpFile] = useState<File | null>(null)
  const [rfpDealId, setRfpDealId] = useState<string>(deals[0]?.id ?? '')
  const [rfpMatchedIds, setRfpMatchedIds] = useState<Set<string> | null>(null)
  const [rfpRequirementCount, setRfpRequirementCount] = useState<number | null>(null)

  function openRfpFlowWithFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      toast.error('Bitte eine PDF- oder DOCX-Datei hochladen.')
      return
    }
    if (deals.length === 0) {
      toast.error('Für den RFP-Abgleich wird mindestens ein Deal benötigt.')
      return
    }
    setRfpFile(file)
    setRfpDealId((prev) => prev || deals[0]!.id)
    setRfpModalOpen(true)
  }

  async function runRfpAnalysis() {
    if (!rfpFile) {
      toast.error('Bitte zuerst eine RFP-Datei auswählen.')
      return
    }
    if (!rfpDealId) {
      toast.error('Bitte einen Deal auswählen.')
      return
    }

    setRfpAnalyzing(true)
    try {
      const formData = new FormData()
      formData.set('dealId', rfpDealId)
      formData.set('file', rfpFile)
      const res = await fetch('/api/rfp/analyze', { method: 'POST', body: formData })
      const json = (await res.json()) as RfpAnalyzeResponse

      if (!res.ok || !json.success) {
        const err = 'error' in json ? json.error : undefined
        toast.error(err ?? 'RFP-Analyse fehlgeschlagen.')
        return
      }

      const matched = new Set<string>()
      for (const item of json.coverage) {
        for (const match of item.matches) matched.add(match.id)
      }
      setRfpMatchedIds(matched)
      setRfpRequirementCount(json.coverage.length)
      setRfpModalOpen(false)
      toast.success(
        matched.size > 0
          ? `${matched.size} passende Referenz${matched.size === 1 ? '' : 'en'} gefunden.`
          : 'Keine passenden Referenzen gefunden.'
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'RFP-Analyse fehlgeschlagen.')
    } finally {
      setRfpAnalyzing(false)
      if (rfpInputRef.current) rfpInputRef.current.value = ''
    }
  }

  function addBulkImportFiles(newFiles: File[]) {
    setBulkImportGroups((prev) => {
      const currentTotal = prev.reduce((s, g) => s + g.files.length, 0)
      const capped = newFiles.slice(0, Math.max(0, 20 - currentTotal))
      if (capped.length === 0) return prev
      const newGroups: BulkImportGroupItem[] = capped.map((file) => ({
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        projectName: file.name.replace(/\.[^.]+$/, '').trim() || file.name,
        files: [file],
      }))
      const next = [...prev, ...newGroups]
      return autoGroupByPrefix(next)
    })
  }

  function autoGroupByPrefix(groups: BulkImportGroupItem[]): BulkImportGroupItem[] {
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
      ([prefix, files]) => ({
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        projectName: files[0]?.name.replace(/\.[^.]+$/, '').trim() ?? prefix ?? 'Referenz',
        files,
      })
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
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(() => new Set())
  const [pageSize, setPageSize] = useState(30)
  const [pageIndex, setPageIndex] = useState(0)
  const [previewRefs, setPreviewRefs] = useState<ReferenceRow[] | null>(null)
  const [shareLinkPopoverRef, setShareLinkPopoverRef] = useState<ReferenceRow | null>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof COLUMN_KEYS)[number], boolean>
  >(DEFAULT_VISIBLE)
  const [columnOrder, setColumnOrder] = useState<ReferenceColumnKey[]>(() =>
    loadColumnOrderFromStorage()
  )
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder))
    } catch {
      /* ignore */
    }
  }, [columnOrder])

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
      if (company.logo_url) map.set(company.id, company.logo_url)
    }
    return map
  }, [companies])

  const filterOptions = useMemo(() => {
    const statuses = new Set<string>()
    const industries = new Set<string>()
    const countries = new Set<string>()
    const projectStatuses = new Set<string>()
    const companies = new Set<string>()
    const tags = new Set<string>()
    for (const r of initialReferences) {
      statuses.add(r.status)
      if (r.industry) industries.add(r.industry)
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
      statuses: Array.from(statuses).sort(),
      industries: Array.from(industries).sort(),
      countries: Array.from(countries).sort(),
      projectStatuses: Array.from(projectStatuses).sort(),
      companies: Array.from(companies).sort((a, b) => a.localeCompare(b, 'de')),
      tags: Array.from(tags).sort((a, b) => a.localeCompare(b, 'de')),
    }
  }, [initialReferences])

  // Sortier-Hilfe: Vergleichswerte pro Spalte
  const getSortValue = (ref: ReferenceRow, key: (typeof COLUMN_KEYS)[number]): string | number => {
    switch (key) {
      case 'status': return ref.status
      case 'company': return (ref.company_name ?? '').toLowerCase()
      case 'title': return (ref.title ?? '').toLowerCase()
      case 'tags': return (ref.tags ?? '').toLowerCase()
      case 'industry': return (ref.industry ?? '').toLowerCase()
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

  // Client-seitiges Filtering (Sales: draft nie anzeigen; optional nur Favoriten) + Sortierung
  const filteredReferences = useMemo(() => {
    let list = referencesWithLocalFavorites
    if (profile.role === 'sales') {
      list = list.filter((r) => r.status !== 'draft')
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
      list = list.filter((r) => r.status === statusFilter)
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
      list = list.filter((r) => (r.industry ?? '') === industryFilter)
    }
    if (countryFilter !== 'all') {
      list = list.filter((r) => (r.country ?? '') === countryFilter)
    }
    if (projectStatusFilter !== 'all') {
      list = list.filter((r) => (r.project_status ?? '') === projectStatusFilter)
    }
    if (rfpMatchedIds) {
      list = list.filter((r) => rfpMatchedIds.has(r.id))
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
    profile.role,
    search,
    statusFilter,
    companyFilter,
    tagsFilter,
    industryFilter,
    countryFilter,
    projectStatusFilter,
    rfpMatchedIds,
    favoritesOnly,
    sortKey,
    sortDir,
  ])

  const pageCount = Math.max(1, Math.ceil(filteredReferences.length / pageSize))
  useEffect(() => {
    setPageIndex((prev) => Math.min(prev, pageCount - 1))
  }, [pageCount])
  const paginatedReferences = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredReferences.slice(start, start + pageSize)
  }, [filteredReferences, pageIndex, pageSize])

  const handleSort = (column: (typeof COLUMN_KEYS)[number]) => {
    if (sortKey === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(column)
      setSortDir('asc')
    }
  }

  const openDetail = (ref: ReferenceRow) => {
    router.push(ROUTES.evidence.detail(ref.id))
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
  const selectedRefLabel = `${selectedCount} Referenz${selectedCount === 1 ? '' : 'en'}`
  const approvalEligibleRefs = useMemo(
    () =>
      selectedRefs.filter(
        (r) =>
          r.status === 'anonymized' ||
          r.status === 'internal_only' ||
          r.status === 'draft'
      ),
    [selectedRefs]
  )
  const approvalEligibleCount = approvalEligibleRefs.length

  const handleBulkRequestApproval = async () => {
    if (approvalEligibleCount === 0) {
      toast.error('Freigabe ist nur für Entwurf-, interne oder anonymisierte Referenzen möglich.')
      return
    }
    const results = await Promise.allSettled(
      approvalEligibleRefs.map((ref) => submitForApproval(ref.id))
    )
    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failedCount = results.length - successCount
    if (successCount > 0) {
      toast.success(
        `${successCount} Referenz${successCount === 1 ? '' : 'en'} zur Freigabe angefragt.`
      )
    }
    if (failedCount > 0) {
      toast.error(
        `${failedCount} Freigabe-Anfrage${failedCount === 1 ? '' : 'n'} konnten nicht gesendet werden.`
      )
    }
    router.refresh()
  }

  useEffect(() => {
    const el = selectAllCheckboxRef.current
    if (!el) return
    el.indeterminate =
      selectedRefIds.size > 0 &&
      filteredReferences.length > 0 &&
      selectedRefIds.size < filteredReferences.length
  }, [selectedRefIds.size, filteredReferences.length])

  const previewOpen = previewRefs !== null && previewRefs.length > 0
  useEffect(() => {
    if (!previewOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [previewOpen])

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

  const handleSubmitForApproval = async (id: string) => {
    try {
      await submitForApproval(id)
      toast.success('Freigabe angefordert. E-Mail wurde versendet.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Anfordern der Freigabe.')
    }
  }

  const handleRequestSpecificApproval = async (id: string) => {
    try {
      await submitForApproval(id)
      toast.success('Einzelfreigabe angefordert. E-Mail wurde versendet.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Anfordern.')
    }
  }

  return (
    <div className="flex flex-col space-y-5">
      {pendingClientApprovals.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ausstehende Kunden-Freigaben</CardTitle>
            <CardDescription>
              Der Kunde hat die Freigabe per Link noch nicht abgeschlossen. Sie können die E-Mail mit
              dem Link erneut senden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingClientApprovals.map((row) => (
              <div
                key={row.approvalId}
                className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <Link
                    href={ROUTES.evidence.detail(row.referenceId)}
                    className="font-medium text-foreground hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.companyName} · angefragt am {formatDateUtcDe(row.requestedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    toast.promise(resendClientApprovalEmail(row.referenceId), {
                      loading: 'E-Mail wird gesendet…',
                      success: () => {
                        router.refresh()
                        return 'Erinnerung wurde per E-Mail gesendet.'
                      },
                      error: (e) =>
                        e instanceof Error ? e.message : 'E-Mail konnte nicht gesendet werden.',
                    })
                  }}
                >
                  <AppIcon icon={Send} size={16} className="mr-2" />
                  Erinnerung senden
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Toolbar & Tabelle */}
      <div className="space-y-3.5">
        {/* Toolbar: Suche bis zu den Buttons; rechts Favoriten → Status → Spalten → … */}
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 sm:gap-3.5 overflow-x-hidden transition-all duration-300">
          <ToolbarSearchField
            variant="dashboard"
            wrapperClassName="min-w-0 flex-1 basis-[min(100%,24rem)] transition-all duration-300"
            placeholder={COPY.dashboard.searchReferencesPlaceholder}
            value={search}
            onChange={setSearch}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              TABLE_TOOLBAR.dashboard.toolbarButton,
              'shrink-0 rounded-lg border-0 px-3 text-muted-foreground hover:bg-muted/70'
            )}
            aria-label="RFP hochladen und Referenzen abgleichen"
            onClick={() => rfpInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) openRfpFlowWithFile(file)
            }}
          >
            <AppIcon icon={UploadIcon} size={16} className="shrink-0" />
            <span>RFP-Abgleich</span>
          </Button>
          <input
            ref={rfpInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) openRfpFlowWithFile(file)
            }}
          />

          {rfpMatchedIds && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs">
              <span className="font-medium text-muted-foreground">
                RFP aktiv: {rfpMatchedIds.size} Treffer
                {rfpRequirementCount !== null ? ` / ${rfpRequirementCount} Anforderungen` : ''}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setRfpMatchedIds(null)
                  setRfpRequirementCount(null)
                }}
              >
                Zurücksetzen
              </Button>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                toolbarSegmentClass,
                favoritesOnly &&
                  'bg-amber-100/70 text-foreground dark:bg-amber-950/40'
              )}
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-label={favoritesOnly ? 'Alle Referenzen anzeigen' : 'Nur Favoriten'}
            >
              <AppIcon
                icon={StarIcon}
                size={16}
                className={cn(
                  'shrink-0',
                  favoritesOnly ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
                )}
              />
              <span className="hidden lg:inline">Favoriten</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    toolbarSegmentClass,
                    statusFilter !== 'all' && 'bg-primary/10 text-primary'
                  )}
                  aria-label="Referenzstatus filtern"
                >
                  <AppIcon icon={Filter} size={16} className="shrink-0 text-muted-foreground" />
                  <span className="hidden lg:inline">Status</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56" onOpenAutoFocus={(e) => e.preventDefault()}>
                <Input
                  placeholder="Status suchen…"
                  value={statusSearch}
                  onChange={(e) => setStatusSearch(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                  {['all', ...filterOptions.statuses]
                    .filter((value) => {
                      if (!statusSearch.trim()) return true
                      const label =
                        value === 'all'
                          ? 'Alle'
                          : STATUS_LABELS[value as ReferenceRow['status']] ?? value
                      return label.toLowerCase().includes(statusSearch.trim().toLowerCase())
                    })
                    .map((value) => {
                      const isAll = value === 'all'
                      const label =
                        isAll ? 'Alle' : STATUS_LABELS[value as ReferenceRow['status']] ?? value
                      const selected = statusFilter === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(value)
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
                        >
                          <span className="truncate">{label}</span>
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                              selected ? 'bg-primary border-primary' : 'bg-muted'
                            }`}
                          >
                            {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                          </div>
                        </button>
                      )
                    })}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(toolbarSegmentClass, "hover:bg-muted/70")}
                  aria-label={COPY.dashboard.columnsToggleAria}
                >
                  <AppIcon icon={SlidersHorizontal} size={16} className="shrink-0" />
                  <span className="hidden lg:inline">{COPY.table.columns}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)]">
                <DropdownMenuLabel>{COPY.dashboard.columnVisibility}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columnOrder.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column}
                    checked={visibleColumns[column]}
                    onCheckedChange={(checked) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        [column]: Boolean(checked),
                      }))
                    }
                    onSelect={(e: Event) => e.preventDefault()}
                  >
                    {COLUMN_LABELS[column]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Admin: Importieren -> Vorschau (X) -> Erstellen -> Warenkorb */}
          {profile.role === 'admin' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={cn(TABLE_TOOLBAR.dashboard.toolbarButton, "hover:bg-muted/70")}
                onClick={() => {
                  setBulkImportGroups([])
                  setBulkImportOpen(true)
                }}
                aria-label="Referenzen importieren"
              >
                <AppIcon icon={UploadIcon} size={16} className="shrink-0" />
                <span className="hidden lg:inline">Importieren</span>
              </Button>
              {selectedRefIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(TABLE_TOOLBAR.dashboard.toolbarButtonGap, "hover:bg-muted/70")}
                  onClick={() => setPreviewRefs(selectedRefs)}
                  aria-label={`Vorschau (${selectedRefIds.size} Referenz${selectedRefIds.size !== 1 ? 'en' : ''})`}
                >
                  <AppIcon icon={Eye} size={16} className="shrink-0" />
                  <span className="hidden lg:inline">Vorschau ({selectedRefIds.size})</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  TABLE_TOOLBAR.dashboard.toolbarButton,
                  'hover:bg-muted/70',
                  statusFilter === 'draft' ? 'bg-primary/10 text-primary' : '',
                )}
                onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
                aria-label={statusFilter === 'draft' ? 'Alle Referenzen anzeigen' : 'Nur Entwürfe'}
              >
                <AppIcon icon={FileText} size={16} className="shrink-0" />
                <span className="hidden lg:inline">Entwürfe</span>
              </Button>
              <Button
                size="sm"
                className={cn(
                  TABLE_TOOLBAR.dashboard.toolbarButton,
                  "rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
                )}
                onClick={() => setNewRefModalOpen(true)}
                aria-label="Neue Referenz erstellen"
              >
                <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
                <span className="hidden lg:inline">Referenz erstellen</span>
              </Button>
            </>
          )}

          {/* Sales: Vorschau-Button wenn Auswahl, dann Warenkorb */}
          {profile.role === 'sales' && selectedRefIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(TABLE_TOOLBAR.dashboard.toolbarButtonGap, "hover:bg-muted/70")}
              onClick={() => setPreviewRefs(selectedRefs)}
              aria-label={`Vorschau (${selectedRefIds.size} Referenz${selectedRefIds.size !== 1 ? 'en' : ''})`}
            >
              <AppIcon icon={Eye} size={16} className="shrink-0" />
              <span className="hidden lg:inline">Vorschau ({selectedRefIds.size})</span>
            </Button>
          )}

          {selectedRefIds.size > 0 ? (
            <div className="fixed bottom-6 left-1/2 z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2">
              <div className="flex items-center justify-between rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75">
                <div className="text-sm text-muted-foreground">
                  {selectedRefIds.size} ausgewählt
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Aktionen
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[260px]">
                    <DropdownMenuLabel>Bulk-Aktionen</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPreviewRefs(selectedRefs)}>
                      <AppIcon icon={Eye} size={16} className="mr-2" />
                      Vorschau
                    </DropdownMenuItem>
                    {profile.role === 'sales' && (
                      <>
                        <DropdownMenuItem
                          onClick={async () => {
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
                            toast.success(`${withFile.length} Referenz${withFile.length !== 1 ? 'en' : ''} werden heruntergeladen.`)
                          }}
                        >
                          <AppIcon icon={FileDownIcon} size={16} className="mr-2" />
                          {selectedRefLabel} als PDF herunterladen
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={approvalEligibleCount === 0}
                          onSelect={async (e: Event) => {
                            e.preventDefault()
                            await handleBulkRequestApproval()
                          }}
                        >
                          <AppIcon icon={Send} size={16} className="mr-2" />
                          {selectedRefLabel} um Freigabe anfragen
                        </DropdownMenuItem>
                      </>
                    )}
                    {profile.role === 'admin' && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(e: Event) => {
                          e.preventDefault()
                          setBulkDeleteConfirmOpen(true)
                        }}
                      >
                        <AppIcon icon={Trash2} size={16} className="mr-2" />
                        Ausgewählte löschen
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedRefIds(new Set())}>
                      <AppIcon icon={Cancel01Icon} size={16} className="mr-2 text-muted-foreground" />
                      Auswahl aufheben
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}
 
          {profile.role === 'admin' && (
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
        </div>

        <div className="min-w-0 overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32px] pr-0">
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
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
                    className="size-4 rounded border-muted-foreground/50"
                    aria-label="Alle auswählen"
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
                      statusSearch,
                      setStatusSearch,
                      projectStatusFilter,
                      setProjectStatusFilter,
                      projectStatusSearch,
                      setProjectStatusSearch,
                      sortKey: sortKey as ReferenceColumnKey | null,
                      sortDir,
                      handleSort: handleSort as (c: ReferenceColumnKey) => void,
                    })}
                  </React.Fragment>
                ))}
                <TableHead className="w-[88px] min-w-[88px] p-2 text-right">
                  <span className="sr-only">Favorit &amp; Aktionen</span>
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
                      <p>
                        {rfpMatchedIds
                          ? 'Keine Referenzen passen zu dieser Ausschreibung.'
                          : 'Keine Referenzen gefunden.'}
                      </p>
                      {!search.trim() &&
                        profile.role === 'admin' && (
                          <Button
                            className="mt-1"
                            onClick={() => setNewRefModalOpen(true)}
                          >
                            Erstelle eine Referenz
                          </Button>
                        )}
                      {profile.role === 'sales' && (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Link href={ROUTES.deals.new}>
                            <Button className="mt-1">
                              Lege deinen ersten Deal an
                            </Button>
                          </Link>
                          <Link href={ROUTES.deals.new}>
                            <Button className="mt-1">
                              Auslaufenden Deal hinzufügen
                            </Button>
                          </Link>
                        </div>
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
                      className="w-[32px] pr-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRefIds.has(ref.id)}
                        onChange={() => toggleCart(ref.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 rounded border-muted-foreground/50"
                        aria-label={`${ref.title} in Warenkorb`}
                      />
                    </TableCell>
                    {orderedVisibleColumnKeys.map((column) => (
                      <React.Fragment key={column}>
                        {renderReferenceColumnCell(column, ref, {
                          PROJECT_STATUS_LABELS,
                          companyLogoById,
                        })}
                      </React.Fragment>
                    ))}
                    <TableCell
                      className="w-[88px] min-w-[88px] p-1 text-right"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-0.5 pr-0 opacity-0 transition-opacity group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 hover:bg-transparent"
                          onClick={(e: React.MouseEvent) => handleToggleFavorite(ref.id, e)}
                          aria-label={ref.is_favorited ? 'Favorit entfernen' : 'Als Favorit markieren'}
                        >
                          <AppIcon
                            icon={StarIcon}
                            size={16}
                            className={
                              ref.is_favorited
                                ? 'text-amber-500 dark:text-amber-400'
                                : 'text-muted-foreground/50 hover:text-amber-500/80'
                            }
                          />
                        </Button>
                        <DropdownMenu
                          open={rowMenuOpenId === ref.id}
                          onOpenChange={(open) => setRowMenuOpenId(open ? ref.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 shrink-0 p-0"
                            >
                              <span className="sr-only">Menü öffnen</span>
                              <AppIcon icon={MoreHorizontal} size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openDetail(ref)}>
                            <AppIcon icon={FileText} size={16} className="mr-2" />
                            Details ansehen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => router.push(ROUTES.evidence.edit(ref.id))}
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
                      </div>
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
                <SelectTrigger size="sm" className="h-8 w-[84px] rounded-lg border-border/70 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((size) => (
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
        onOpenChange={setSheetOpen}
        selectedRef={selectedRef}
        profile={profile}
        externalContacts={externalContacts}
        detailAssets={detailAssets}
        detailAssetsLoading={detailAssetsLoading}
        setDetailAssets={setDetailAssets}
        normalizeTagLabel={normalizeTagLabel}
        onToggleFavorite={handleToggleFavorite}
        onOpenShareLink={setShareLinkPopoverRef}
        onSubmitForApproval={handleSubmitForApproval}
        onRequestSpecificApproval={handleRequestSpecificApproval}
        onDelete={handleDelete}
      />

      <ShareLinkDialog
        reference={shareLinkPopoverRef}
        onClose={() => setShareLinkPopoverRef(null)}
      />

      <ReferencePreviewDialog
        previewRefs={previewRefs}
        onClose={() => setPreviewRefs(null)}
      />

      <Dialog open={rfpModalOpen} onOpenChange={setRfpModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RFP-Abgleich starten</DialogTitle>
            <DialogDescription>
              Datei hochladen und sofort passende Referenzen aus deiner Liste anzeigen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Datei</p>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {rfpFile ? rfpFile.name : 'Keine Datei ausgewählt'}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Deal</p>
              <Select value={rfpDealId || '__none__'} onValueChange={(v) => setRfpDealId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Deal auswählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Auswählen —</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRfpModalOpen(false)
                setRfpFile(null)
              }}
              disabled={rfpAnalyzing}
            >
              Abbrechen
            </Button>
            <Button onClick={runRfpAnalysis} disabled={rfpAnalyzing || !rfpFile || !rfpDealId}>
              {rfpAnalyzing ? 'Analyse läuft …' : 'Abgleich starten'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {profile.role === 'admin' && (
        <NewReferenceDialog
          open={newRefModalOpen}
          onOpenChange={setNewRefModalOpen}
          companies={companies}
          contacts={contacts}
          externalContacts={externalContacts}
        />
      )}

      {/* Bulk-Import-Modal (nur Admin) */}
      {profile.role === 'admin' && (
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
