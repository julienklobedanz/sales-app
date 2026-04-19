'use client'

import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { ReferenceStatusBadge } from '@/components/reference-status-badge'
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cancel01Icon,
  CirclePlus,
  CopyIcon,
  Eye,
  FileDownIcon,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Send,
  ShoppingCartIcon,
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
import { ReferenceDetailSheet } from './overview/reference-detail-sheet'
import { toast } from 'sonner'
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

/** Spalten-Keys und Standard-Sichtbarkeit: Status, Unternehmen, Titel, Tags, Projektstatus, Letzte Änderung */
const COLUMN_KEYS = [
  'status',
  'company',
  'title',
  'tags',
  'industry',
  'country',
  'project_status',
  'project_start',
  'project_end',
  'duration_months',
  'created_at',
  'updated_at',
] as const
const DEFAULT_VISIBLE: Record<(typeof COLUMN_KEYS)[number], boolean> = {
  status: true,
  company: true,
  title: true,
  tags: true,
  industry: false,
  country: false,
  project_status: true,
  project_start: false,
  project_end: false,
  duration_months: false,
  created_at: false,
  updated_at: true,
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

/** Toolbar: Favoriten / Status / Spalten – gleiche Mindestbreite */
const toolbarSegmentClass = `${TABLE_TOOLBAR.dashboard.toolbarButton} justify-center gap-1.5 px-2.5`

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
  const [previewRefs, setPreviewRefs] = useState<ReferenceRow[] | null>(null)
  const [shareLinkPopoverRef, setShareLinkPopoverRef] = useState<ReferenceRow | null>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof COLUMN_KEYS)[number], boolean>
  >(DEFAULT_VISIBLE)

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
    <div className="flex flex-col space-y-6">
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
      <div className="space-y-4">
        {/* Toolbar: Suche bis zu den Buttons; rechts Favoriten → Status → Spalten → … */}
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-3 overflow-x-hidden transition-all duration-300">
          <ToolbarSearchField
            variant="dashboard"
            wrapperClassName="min-w-0 flex-1 basis-[min(100%,24rem)] transition-all duration-300"
            placeholder={COPY.dashboard.searchReferencesPlaceholder}
            value={search}
            onChange={setSearch}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              TABLE_TOOLBAR.dashboard.toolbarButton,
              'shrink-0 rounded-lg border-dashed px-3 text-muted-foreground'
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
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-2 text-xs">
              <span className="font-medium text-foreground">
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

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                toolbarSegmentClass,
                favoritesOnly &&
                  'border-amber-400/60 bg-amber-50/70 text-foreground dark:bg-amber-950/40'
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
                  variant="outline"
                  className={cn(
                    toolbarSegmentClass,
                    statusFilter !== 'all' && 'border-primary ring-1 ring-primary/35'
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
                  variant="outline"
                  className={toolbarSegmentClass}
                  aria-label={COPY.dashboard.columnsToggleAria}
                >
                  <AppIcon icon={SlidersHorizontal} size={16} className="shrink-0" />
                  <span className="hidden lg:inline">{COPY.table.columns}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)]">
                <DropdownMenuLabel>{COPY.dashboard.columnVisibility}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {COLUMN_KEYS.map((column) => (
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
                variant="outline"
                size="sm"
                className={TABLE_TOOLBAR.dashboard.toolbarButton}
                onClick={() => {
                  setBulkImportGroups([])
                  setBulkImportOpen(true)
                }}
                aria-label="Referenzen importieren"
              >
                <AppIcon icon={UploadIcon} size={16} className="shrink-0 lg:mr-2" />
                <span className="hidden lg:inline">Importieren</span>
              </Button>
              {selectedRefIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className={TABLE_TOOLBAR.dashboard.toolbarButtonGap}
                  onClick={() => setPreviewRefs(selectedRefs)}
                  aria-label={`Vorschau (${selectedRefIds.size} Referenz${selectedRefIds.size !== 1 ? 'en' : ''})`}
                >
                  <AppIcon icon={Eye} size={16} className="shrink-0" />
                  <span className="hidden lg:inline">Vorschau ({selectedRefIds.size})</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  TABLE_TOOLBAR.dashboard.toolbarButton,
                  'bg-background',
                  statusFilter === 'draft' ? 'border-primary ring-1 ring-primary' : '',
                )}
                onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
                aria-label={statusFilter === 'draft' ? 'Alle Referenzen anzeigen' : 'Nur Entwürfe'}
              >
                <AppIcon icon={FileText} size={16} className="shrink-0 lg:mr-2" />
                <span className="hidden lg:inline">Entwürfe</span>
              </Button>
              <Button
                size="sm"
                className={TABLE_TOOLBAR.dashboard.toolbarButton}
                onClick={() => setNewRefModalOpen(true)}
                aria-label="Neue Referenz erstellen"
              >
                <AppIcon icon={CirclePlus} size={16} className="shrink-0 lg:mr-2" />
                <span className="hidden lg:inline">Erstellen</span>
              </Button>
            </>
          )}

          {/* Sales: Vorschau-Button wenn Auswahl, dann Warenkorb */}
          {profile.role === 'sales' && selectedRefIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className={TABLE_TOOLBAR.dashboard.toolbarButtonGap}
              onClick={() => setPreviewRefs(selectedRefs)}
              aria-label={`Vorschau (${selectedRefIds.size} Referenz${selectedRefIds.size !== 1 ? 'en' : ''})`}
            >
              <AppIcon icon={Eye} size={16} className="shrink-0" />
              <span className="hidden lg:inline">Vorschau ({selectedRefIds.size})</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="relative h-11 w-11 shrink-0 rounded-lg bg-foreground text-background transition-all duration-300 hover:bg-foreground/90"
                aria-label={selectedRefIds.size > 0 ? `Warenkorb (${selectedRefIds.size} Referenzen)` : 'Warenkorb'}
              >
                <AppIcon icon={ShoppingCartIcon} size={16} />
                {selectedRefIds.size > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-background/90 px-1 text-[10px] font-medium text-foreground">
                    {selectedRefIds.size}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[240px]">
              {selectedRefIds.size === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Keine Referenzen ausgewählt. Nutze die Checkboxen links in der Tabelle, um Referenzen in den Warenkorb zu legen.
                </p>
              ) : (
                <>
                  <DropdownMenuLabel>
                    {selectedRefLabel} ausgewählt
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
 
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

        <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px] pr-0">
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
                {visibleColumns.status && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-left hover:opacity-80 ${statusFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{COLUMN_LABELS.status}</span>
                            {statusFilter !== 'all' && <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-56"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Input
                            autoFocus
                            placeholder="Status suchen…"
                            value={statusSearch}
                            onChange={(e) => setStatusSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                            {['all', ...filterOptions.statuses].filter((value) => {
                              if (!statusSearch.trim()) return true
                              const label =
                                value === 'all'
                                  ? 'Alle'
                                  : STATUS_LABELS[value as ReferenceRow['status']] ?? value
                              return label.toLowerCase().includes(statusSearch.trim().toLowerCase())
                            }).map((value) => {
                              const isAll = value === 'all'
                              const label =
                                isAll
                                  ? 'Alle'
                                  : STATUS_LABELS[value as ReferenceRow['status']] ?? value
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
                      <button
                        type="button"
                        className="flex items-center gap-0.5 hover:opacity-80"
                        onClick={() => handleSort('status')}
                      >
                        {sortKey === 'status' ? (
                          sortDir === 'asc' ? (
                            <AppIcon icon={ArrowUp} size={14} className="text-primary" />
                          ) : (
                            <AppIcon icon={ArrowDown} size={14} className="text-primary" />
                          )
                        ) : (
                          <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.company && (
                  <TableHead className="w-[180px]">
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-left hover:opacity-80 ${companyFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{COLUMN_LABELS.company}</span>
                            {companyFilter !== 'all' && <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Input
                            autoFocus
                            placeholder="Unternehmen suchen…"
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                            {['all', ...filterOptions.companies].filter((value) => {
                              if (!companySearch.trim()) return true
                              const label = value === 'all' ? 'Alle' : value
                              return label.toLowerCase().includes(companySearch.trim().toLowerCase())
                            }).map((value) => {
                              const isAll = value === 'all'
                              const label = isAll ? 'Alle' : value
                              const selected = companyFilter === value
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setCompanyFilter(value)
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
                      <button
                        type="button"
                        className="flex items-center gap-0.5 hover:opacity-80"
                        onClick={() => handleSort('company')}
                      >
                        {sortKey === 'company' ? (
                          sortDir === 'asc' ? (
                            <AppIcon icon={ArrowUp} size={14} className="text-primary" />
                          ) : (
                            <AppIcon icon={ArrowDown} size={14} className="text-primary" />
                          )
                        ) : (
                          <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.title && (
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-0.5 hover:opacity-80"
                      onClick={() => handleSort('title')}
                    >
                      {COLUMN_LABELS.title}
                      {sortKey === 'title' ? (
                        sortDir === 'asc' ? (
                          <AppIcon icon={ArrowUp} size={14} className="text-primary" />
                        ) : (
                          <AppIcon icon={ArrowDown} size={14} className="text-primary" />
                        )
                      ) : (
                        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                {visibleColumns.tags && (
                  <TableHead className="max-w-[120px]">
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-left hover:opacity-80 ${tagsFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{COLUMN_LABELS.tags}</span>
                            {tagsFilter !== 'all' && <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Input
                            autoFocus
                            placeholder="Tags suchen…"
                            value={tagsSearch}
                            onChange={(e) => setTagsSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                            {['all', ...filterOptions.tags].filter((value) => {
                              if (!tagsSearch.trim()) return true
                              const label = value === 'all' ? 'Alle' : value
                              return label.toLowerCase().includes(tagsSearch.trim().toLowerCase())
                            }).map((value) => {
                              const isAll = value === 'all'
                              const label = isAll ? 'Alle' : value
                              const selected = tagsFilter === value
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setTagsFilter(value)
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
                      <button
                        type="button"
                        className="flex items-center gap-0.5 hover:opacity-80"
                        onClick={() => handleSort('tags')}
                      >
                        {sortKey === 'tags' ? (
                          sortDir === 'asc' ? (
                            <AppIcon icon={ArrowUp} size={14} className="text-primary" />
                          ) : (
                            <AppIcon icon={ArrowDown} size={14} className="text-primary" />
                          )
                        ) : (
                          <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.industry && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-left hover:opacity-80 ${industryFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{COLUMN_LABELS.industry}</span>
                            {industryFilter !== 'all' && <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Input
                            autoFocus
                            placeholder="Industrie suchen…"
                            value={industrySearch}
                            onChange={(e) => setIndustrySearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                            {['all', ...filterOptions.industries].filter((value) => {
                              if (!industrySearch.trim()) return true
                              const label = value === 'all' ? 'Alle' : value
                              return label.toLowerCase().includes(industrySearch.trim().toLowerCase())
                            }).map((value) => {
                              const isAll = value === 'all'
                              const label = isAll ? 'Alle' : value
                              const selected = industryFilter === value
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setIndustryFilter(value)
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
                      <button
                        type="button"
                        className="flex items-center gap-0.5 hover:opacity-80"
                        onClick={() => handleSort('industry')}
                      >
                        {sortKey === 'industry' ? (
                          sortDir === 'asc' ? (
                            <AppIcon icon={ArrowUp} size={14} />
                          ) : (
                            <AppIcon icon={ArrowDown} size={14} />
                          )
                        ) : (
                          <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.country && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-left hover:opacity-80 ${countryFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{COLUMN_LABELS.country}</span>
                            {countryFilter !== 'all' && <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-56"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Input
                            autoFocus
                            placeholder="HQ suchen…"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                            {['all', ...filterOptions.countries].filter((value) => {
                              if (!countrySearch.trim()) return true
                              const label = value === 'all' ? 'Alle' : value
                              return label.toLowerCase().includes(countrySearch.trim().toLowerCase())
                            }).map((value) => {
                              const isAll = value === 'all'
                              const label = isAll ? 'Alle' : value
                              const selected = countryFilter === value
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setCountryFilter(value)
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
                      <button
                        type="button"
                        className="flex items-center gap-0.5 hover:opacity-80"
                        onClick={() => handleSort('country')}
                      >
                        {sortKey === 'country' ? (
                          sortDir === 'asc' ? (
                            <AppIcon icon={ArrowUp} size={14} />
                          ) : (
                            <AppIcon icon={ArrowDown} size={14} />
                          )
                        ) : (
                          <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.project_status && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-left hover:opacity-80 ${projectStatusFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{COLUMN_LABELS.project_status}</span>
                            {projectStatusFilter !== 'all' && <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Input
                            autoFocus
                            placeholder="Projektstatus suchen…"
                            value={projectStatusSearch}
                            onChange={(e) => setProjectStatusSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                            {['all', ...filterOptions.projectStatuses].filter((value) => {
                              if (!projectStatusSearch.trim()) return true
                              const label =
                                value === 'all'
                                  ? 'Alle'
                                  : value === 'active'
                                    ? 'Aktiv'
                                    : 'Abgeschlossen'
                              return label.toLowerCase().includes(projectStatusSearch.trim().toLowerCase())
                            }).map((value) => {
                              const isAll = value === 'all'
                              const label =
                                isAll ? 'Alle' : value === 'active' ? 'Aktiv' : 'Abgeschlossen'
                              const selected = projectStatusFilter === value
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setProjectStatusFilter(value)
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
                      <button
                        type="button"
                        className="flex items-center gap-0.5 hover:opacity-80"
                        onClick={() => handleSort('project_status')}
                      >
                        {sortKey === 'project_status' ? (
                          sortDir === 'asc' ? (
                            <AppIcon icon={ArrowUp} size={14} />
                          ) : (
                            <AppIcon icon={ArrowDown} size={14} />
                          )
                        ) : (
                          <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                )}
                {visibleColumns.project_start && (
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-0.5 hover:opacity-80"
                      onClick={() => handleSort('project_start')}
                    >
                      {COLUMN_LABELS.project_start}
                      {sortKey === 'project_start' ? (
                        sortDir === 'asc' ? (
                          <AppIcon icon={ArrowUp} size={14} />
                        ) : (
                          <AppIcon icon={ArrowDown} size={14} />
                        )
                      ) : (
                        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                {visibleColumns.project_end && (
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-0.5 hover:opacity-80"
                      onClick={() => handleSort('project_end')}
                    >
                      {COLUMN_LABELS.project_end}
                      {sortKey === 'project_end' ? (
                        sortDir === 'asc' ? (
                          <AppIcon icon={ArrowUp} size={14} />
                        ) : (
                          <AppIcon icon={ArrowDown} size={14} />
                        )
                      ) : (
                        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                {visibleColumns.duration_months && (
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-0.5 hover:opacity-80"
                      onClick={() => handleSort('duration_months')}
                    >
                      {COLUMN_LABELS.duration_months}
                      {sortKey === 'duration_months' ? (
                        sortDir === 'asc' ? (
                          <AppIcon icon={ArrowUp} size={14} />
                        ) : (
                          <AppIcon icon={ArrowDown} size={14} />
                        )
                      ) : (
                        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                {visibleColumns.created_at && (
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-0.5 hover:opacity-80"
                      onClick={() => handleSort('created_at')}
                    >
                      {COLUMN_LABELS.created_at}
                      {sortKey === 'created_at' ? (
                        sortDir === 'asc' ? (
                          <AppIcon icon={ArrowUp} size={14} />
                        ) : (
                          <AppIcon icon={ArrowDown} size={14} />
                        )
                      ) : (
                        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                {visibleColumns.updated_at && (
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="ml-auto flex items-center gap-0.5 hover:opacity-80"
                      onClick={() => handleSort('updated_at')}
                    >
                      {COLUMN_LABELS.updated_at}
                      {sortKey === 'updated_at' ? (
                        sortDir === 'asc' ? (
                          <AppIcon icon={ArrowUp} size={14} />
                        ) : (
                          <AppIcon icon={ArrowDown} size={14} />
                        )
                      ) : (
                        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead className="w-[88px] min-w-[88px] p-2 text-right">
                  <span className="sr-only">Favorit &amp; Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      COLUMN_KEYS.filter((k) => visibleColumns[k]).length + 2
                    }
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
                filteredReferences.map((ref) => (
                  <TableRow
                    key={ref.id}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => openDetail(ref)}
                    onContextMenu={(e: React.MouseEvent) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setRowMenuOpenId(ref.id)
                    }}
                  >
                    <TableCell
                      className="w-[44px] pr-0"
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
                    {visibleColumns.status && (
                      <TableCell>
                        <ReferenceStatusBadge
                          status={ref.status}
                          customerApprovalStatus={ref.customer_approval_status}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.company && (
                      <TableCell className="font-medium">
                        {companyLogoById.get(ref.company_id) ? (
                          <Link
                            href={ROUTES.accountsDetail(ref.company_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`${ref.company_name} öffnen`}
                          >
                            <Image
                              src={companyLogoById.get(ref.company_id)!}
                              alt={ref.company_name}
                              width={22}
                              height={22}
                              className="h-[22px] w-[22px] rounded-sm object-contain"
                            />
                            <span className="sr-only">{ref.company_name}</span>
                          </Link>
                        ) : (
                          ref.company_name
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.title && (
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {ref.title}
                      </TableCell>
                    )}
                    {visibleColumns.tags && (
                      <TableCell className="max-w-[140px]">
                        {ref.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {ref.tags
                              .split(/[\s,]+/)
                              .map((t) => t.trim())
                              .filter(Boolean)
                              .slice(0, 3)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.industry && <TableCell>{ref.industry ?? '—'}</TableCell>}
                    {visibleColumns.country && <TableCell>{ref.country ?? '—'}</TableCell>}
                    {visibleColumns.project_status && (
                      <TableCell className="text-sm text-muted-foreground">
                        {ref.project_status
                          ? PROJECT_STATUS_LABELS[ref.project_status] ?? ref.project_status
                          : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.project_start && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.project_start ? formatDateUtcDe(ref.project_start) : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.project_end && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.project_end ? formatDateUtcDe(ref.project_end) : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.duration_months && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.duration_months != null ? `${ref.duration_months}` : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.created_at && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDateUtcDe(ref.created_at)}
                      </TableCell>
                    )}
                    {visibleColumns.updated_at && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.updated_at ? formatDateUtcDe(ref.updated_at) : '—'}
                      </TableCell>
                    )}
                    <TableCell
                      className="w-[88px] min-w-[88px] p-1 text-right"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-0.5 pr-0">
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
                              className="h-8 w-8 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
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
