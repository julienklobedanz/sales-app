'use client'

import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ReferenceRow, ReferenceAssetRow, DeletedReferenceRow } from './actions'
import { ReferenceForm } from './new/reference-form'
import type { ReferenceFormInitialData } from './new/reference-form'
import {
  bulkCreateReferencesFromFiles,
  createSharedPortfolio,
  deleteReference,
  getDeletedReferences,
  getExistingShareForReference,
  getReferenceAssets,
  hardDeleteReference,
  emptyTrash,
  restoreReference,
  submitForApproval,
  toggleFavorite,
  updateReferenceAssetCategory,
} from './actions'
import type { Profile } from './dashboard-shell'
import {
  PlusCircleIcon,
  SlidersHorizontal,
  PencilIcon as Pencil,
  Trash2Icon,
  GlobeIcon,
  Building2Icon,
  MapPinIcon,
  ExternalLinkIcon,
  CalendarIcon,
  TagIcon,
  ActivityIcon,
  TimerIcon,
  HistoryIcon,
  UserIcon,
  Users,
  MoreHorizontal,
  CopyIcon,
  FileTextIcon,
  SearchIcon as Search,
  HandshakeIcon as Handshake,
  RocketIcon as Rocket,
  CheckCircle,
  Send,
  Mail,
  Phone,
  Star,
  XIcon,
  FileDownIcon,
  UploadIcon,
  Loader2,
  ShoppingCartIcon,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Eye,
  Link as LinkIcon,
} from 'lucide-react'
import { ReferenceReader } from './reference-reader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import type { ExtractedReferenceData } from './new/types'

// --- Konstanten & Hilfsfunktionen ---

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  internal_only: 'Nur Intern',
  approved: 'Extern freigegeben',
  anonymized: 'Anonymisiert',
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: 'border border-muted-foreground/30 bg-muted text-foreground',
  internal_only:
    'border border-amber-300 bg-amber-50 text-amber-800',
  approved:
    'border border-emerald-300 bg-emerald-50 text-emerald-800',
  anonymized:
    'border border-sky-300 bg-sky-50 text-sky-800',
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
  status: 'Status',
  company: 'Unternehmen',
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

/** Deterministisches Datumsformat (Server = Client), vermeidet Hydration-Fehler durch toLocaleDateString. */
function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

/** Tausender-Trennzeichen (de-DE: 5.000.000) */
function formatNumber(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('de-DE')
}

function diffMonthsUtc(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  return Math.max(
    0,
    (e.getUTCFullYear() - s.getUTCFullYear()) * 12 +
      (e.getUTCMonth() - s.getUTCMonth())
  )
}

// --- Freigabe-Stepper ---

const APPROVAL_STEPS = [
  { id: 'creation', label: 'Erstellung', sub: 'In Bearbeitung', icon: Pencil },
  { id: 'validation', label: 'Validierung', sub: 'Wartet auf Validierung', icon: Search },
  { id: 'approval', label: 'Freigabe', sub: 'Wartet auf Freigabe', icon: Handshake },
  { id: 'publishing', label: 'Veröffentlichung', sub: 'Verfügbar für Sales', icon: Rocket },
] as const

type ApprovalStepId = (typeof APPROVAL_STEPS)[number]['id']

function getCurrentApprovalStep(status: ReferenceRow['status']): ApprovalStepId {
  if (status === 'draft') return 'creation'
  if (status === 'internal_only') return 'validation'
  return 'publishing'
}

function ApprovalStepper({
  status,
  accountOwner,
}: {
  status: ReferenceRow['status']
  accountOwner?: string | null
}) {
  const currentId = getCurrentApprovalStep(status)
  const currentIndex = APPROVAL_STEPS.findIndex((s) => s.id === currentId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {APPROVAL_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isActive = index === currentIndex
          const Icon = step.icon
          return (
            <React.Fragment key={step.id}>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <Avatar
                      size="sm"
                      className={[
                        'border-2',
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-emerald-50'
                          : isActive
                            ? 'border-yellow-400 bg-background'
                            : 'border-muted-foreground/30 bg-background text-muted-foreground',
                      ].join(' ')}
                    >
                      <AvatarFallback className="bg-transparent text-current">
                        <Icon className="size-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="text-[11px] font-semibold">
                        {step.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {step.sub}
                      </div>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-w-sm text-xs">
                  <p className="font-semibold mb-1">{step.label}</p>
                  <p className="text-muted-foreground mb-2">{step.sub}</p>
                  {step.id === 'approval' && accountOwner && (
                    <p className="text-muted-foreground">
                      Anfrage an <span className="font-medium">{accountOwner}</span>{' '}
                      möglich.
                    </p>
                  )}
                  {step.id === 'publishing' && (
                    <p className="text-muted-foreground">
                      Die Referenz ist in diesem Schritt für Sales sichtbar und nutzbar,
                      abhängig vom gewählten Freigabestatus.
                    </p>
                  )}
                </PopoverContent>
              </Popover>
              {index < APPROVAL_STEPS.length - 1 && (
                <Separator
                  className={[
                    'hidden flex-1 sm:block h-[2px]',
                    isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                  ].join(' ')}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// --- Hauptkomponente ---

type CompanyOption = { id: string; name: string; logo_url?: string | null }
type ContactOption = { id: string; first_name: string | null; last_name: string | null; email: string | null }

export function DashboardOverview({
  references: initialReferences,
  totalCount,
  deletedCount,
  profile,
  title = 'Referenzen',
  initialFavoritesOnly = false,
  initialStatusFilter = 'all',
  companies = [],
  contacts = [],
  externalContacts = [],
}: {
  references: ReferenceRow[]
  totalCount: number
  deletedCount: number
  profile: Profile
  title?: string
  initialFavoritesOnly?: boolean
  initialStatusFilter?: string
  companies?: CompanyOption[]
  contacts?: ContactOption[]
  externalContacts?: { id: string; company_id: string; first_name: string | null; last_name: string | null; email: string | null; role: string | null; phone?: string | null }[]
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
  const [rfpFiles, setRfpFiles] = useState<File[]>([])
  const [rfpMatchScores, setRfpMatchScores] = useState<Record<string, number> | null>(null)
  const [rfpMatching, setRfpMatching] = useState(false)
  const [isRfpDragging, setIsRfpDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
  type BulkImportGroupItem = { id: string; projectName: string; files: File[] }
  const [bulkImportGroups, setBulkImportGroups] = useState<BulkImportGroupItem[]>([])
  const [bulkImportLoading, setBulkImportLoading] = useState(false)
  const bulkImportDropRef = useRef<HTMLInputElement>(null)

  const totalBulkImportFiles = bulkImportGroups.reduce((s, g) => s + g.files.length, 0)

  const [trashOpen, setTrashOpen] = useState(false)
  const [trashItems, setTrashItems] = useState<DeletedReferenceRow[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
  const [newRefModalOpen, setNewRefModalOpen] = useState(false)

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

  function buildRfpKeywords(data: ExtractedReferenceData): string[] {
    const parts: string[] = []
    if (data.industry) parts.push(data.industry)
    if (data.summary) parts.push(data.summary)
    if (data.customer_challenge) parts.push(data.customer_challenge)
    if (data.our_solution) parts.push(data.our_solution)
    if (Array.isArray(data.tags)) parts.push(...data.tags)
    const text = parts.join(' ').toLowerCase()
    if (!text.trim()) return []
    const tokens = text.split(/[^a-z0-9äöüß]+/i).filter((t) => t.length >= 3)
    return Array.from(new Set(tokens))
  }

  async function runRfpMatch(file: File) {
    try {
      setRfpMatching(true)
      const formData = new FormData()
      formData.set('file', file)
      const res = await fetch('/api/rfp-match', {
        method: 'POST',
        body: formData,
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        const msg: string =
          (payload && typeof payload.error === 'string' && payload.error) ||
          'RFP-Analyse fehlgeschlagen. Du kannst trotzdem manuell nach Referenzen filtern.'
        toast.error(msg)
        setRfpMatchScores(null)
        return
      }
      const data = payload.data as ExtractedReferenceData
      const keywords = buildRfpKeywords(data)
      const scores: Record<string, number> = {}
      for (const ref of initialReferences) {
        let score = 0
        if (data.industry && ref.industry && ref.industry === data.industry) {
          score += 3
        }
        const refTags = (ref.tags ?? '')
          .toLowerCase()
          .split(/[\s,;]+/)
          .filter(Boolean)
        if (Array.isArray(data.tags) && data.tags.length && refTags.length) {
          for (const t of data.tags) {
            const tag = t.toLowerCase()
            if (refTags.includes(tag)) score += 2
          }
        }
        const haystack = [
          ref.title,
          ref.summary ?? '',
          ref.customer_challenge ?? '',
          ref.our_solution ?? '',
          ref.tags ?? '',
        ]
          .join(' ')
          .toLowerCase()
        for (const kw of keywords) {
          if (haystack.includes(kw)) score += 1
        }
        if (score > 0) {
          scores[ref.id] = score
        }
      }
      setRfpMatchScores(Object.keys(scores).length ? scores : null)
      if (!Object.keys(scores).length) {
        toast.info(
          'RFP analysiert, aber keine klar passenden Referenzen gefunden. Du kannst weiterhin manuell filtern.'
        )
      } else {
        toast.success('RFP analysiert – Referenzen nach Relevanz gefiltert.')
      }
    } catch (e) {
      console.error('runRfpMatch error', e)
      toast.error(
        'RFP-Analyse fehlgeschlagen. Bitte später erneut versuchen oder manuell nach Referenzen filtern.'
      )
      setRfpMatchScores(null)
    } finally {
      setRfpMatching(false)
    }
  }

  function resetRfpFilter() {
    setRfpFiles([])
    setRfpMatchScores(null)
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
      ([_, files]) => ({
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        projectName: files[0]?.name.replace(/\.[^.]+$/, '').trim() ?? 'Referenz',
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
  const [shareLinkUrl, setShareLinkUrl] = useState<string | null>(null)
  const [shareLinkLoading, setShareLinkLoading] = useState(false)
  const [shareLinkGenerateLoading, setShareLinkGenerateLoading] = useState(false)
  useEffect(() => {
    if (!shareLinkPopoverRef) {
      setShareLinkUrl(null)
      return
    }
    setShareLinkLoading(true)
    getExistingShareForReference(shareLinkPopoverRef.id)
      .then((existing) => setShareLinkUrl(existing?.url ?? null))
      .finally(() => setShareLinkLoading(false))
  }, [shareLinkPopoverRef?.id])
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
    if (rfpMatchScores && Object.keys(rfpMatchScores).length > 0) {
      const scored = list
        .map((r) => ({ ref: r, score: rfpMatchScores[r.id] ?? 0 }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
      list = scored.map((x) => x.ref)
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
    favoritesOnly,
    sortKey,
    sortDir,
    rfpMatchScores,
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
    setSelectedRef(ref)
    setSheetOpen(true)
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

  const handleRfpFilesAdd = (fileList: FileList | null) => {
    if (!fileList) return
    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const newFiles = Array.from(fileList).filter(
      (file) =>
        acceptedTypes.includes(file.type) ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx')
    )

    if (!newFiles.length) return

    setRfpFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const uniqueNewFiles = newFiles.filter((f) => !existingNames.has(f.name))
      return [...prev, ...uniqueNewFiles]
    })

    // Starte sofort die RFP-Analyse mit der ersten neuen Datei
    void runRfpMatch(newFiles[0]!)
  }

  const handleRfpFileRemove = (name: string) => {
    setRfpFiles((prev) => prev.filter((file) => file.name !== name))
  }

  const handleRfpDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsRfpDragging(false)
    handleRfpFilesAdd(event.dataTransfer.files)
  }

  const handleRfpDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isRfpDragging) setIsRfpDragging(true)
  }

  const handleRfpDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsRfpDragging(false)
  }

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      {/* Header: Titel + Aktionen */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          {/* Papierkorb-Icon */}
          <button
            type="button"
            aria-label={
              deletedCount > 0
                ? `Papierkorb (${deletedCount} Einträge)`
                : 'Papierkorb'
            }
            onClick={async () => {
              if (deletedCount === 0) return
              setTrashOpen(true)
              setTrashLoading(true)
              try {
                const items = await getDeletedReferences()
                setTrashItems(items)
              } finally {
                setTrashLoading(false)
              }
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-background text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-60"
            disabled={deletedCount === 0}
          >
            <Trash2Icon
              className={[
                'size-4',
                deletedCount > 0
                  ? 'text-destructive'
                  : 'text-muted-foreground/50',
              ].join(' ')}
            />
            {deletedCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {deletedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Toolbar & Tabelle */}
      <div className="space-y-4">
        {/* Toolbar: eine Zeile, kein horizontaler Scroll. Suche flex-1, Buttons adaptiv mit Transitions. */}
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0 overflow-x-hidden transition-all duration-300">
          {/* Suche: immer sichtbar, nimmt verfügbaren Platz */}
          <div className="relative min-w-0 flex-1 basis-0 sm:basis-auto transition-all duration-300">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Referenzen suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full min-w-0 pl-9"
            />
          </div>

          {/* RFP-Abgleich */}
          <div className="flex items-center gap-2">
            <div
              className={[
                'flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed px-3 text-xs transition-all duration-300 min-w-[2.25rem] lg:min-w-[140px]',
                isRfpDragging
                  ? 'border-primary bg-primary/5 text-primary animate-pulse'
                  : 'border-muted-foreground/40 bg-muted/40 text-muted-foreground hover:bg-muted',
                rfpMatching ? 'cursor-wait opacity-80' : '',
              ].join(' ')}
              onClick={() => !rfpMatching && fileInputRef.current?.click()}
              onDrop={handleRfpDrop}
              onDragOver={handleRfpDragOver}
              onDragLeave={handleRfpDragLeave}
            >
              <UploadIcon className="size-4 shrink-0 lg:mr-1" aria-hidden />
              <span className="hidden truncate lg:inline">
                {rfpMatching
                  ? 'Analysiere RFP-Anforderungen…'
                  : isRfpDragging
                    ? '→ Dokument hier loslassen zum Analysieren'
                    : rfpFiles.length === 0
                      ? 'RFP-Abgleich'
                      : `${rfpFiles.length} ausgewählt`}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => handleRfpFilesAdd(event.target.files)}
              />
            </div>
            {rfpMatchScores && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 text-xs"
                onClick={resetRfpFilter}
              >
                Filter zurücksetzen
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 transition-all duration-300"
                aria-label="Spalten ein-/ausblenden"
              >
                <SlidersHorizontal className="h-4 w-4 lg:mr-2 shrink-0" />
                <span className="hidden lg:inline">Spalten</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel>Sichtbarkeit</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMN_KEYS.map((column) => (
                <DropdownMenuItem
                  key={column}
                  onSelect={(e: Event) => {
                    e.preventDefault()
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [column]: !prev[column],
                    }))
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                        visibleColumns[column] ? 'bg-primary border-primary' : 'bg-muted'
                      }`}
                    >
                      {visibleColumns[column] && (
                        <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span>{COLUMN_LABELS[column]}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={favoritesOnly ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 shrink-0 transition-all duration-300"
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-label={favoritesOnly ? 'Favoriten aus' : 'Nur Favoriten'}
          >
            <Star className={`size-4 shrink-0 lg:mr-2 ${favoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            <span className="hidden lg:inline">Favoriten</span>
          </Button>

          {/* Admin: Importieren -> Vorschau (X) -> Erstellen -> Warenkorb */}
          {profile.role === 'admin' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 transition-all duration-300"
                onClick={() => {
                  setBulkImportGroups([])
                  setBulkImportOpen(true)
                }}
                aria-label="Referenzen importieren"
              >
                <UploadIcon className="size-4 shrink-0 lg:mr-2" />
                <span className="hidden lg:inline">Importieren</span>
              </Button>
              {selectedRefIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 transition-all duration-300"
                  onClick={() => setPreviewRefs(selectedRefs)}
                  aria-label={`Vorschau (${selectedRefIds.size} Referenz${selectedRefIds.size !== 1 ? 'en' : ''})`}
                >
                  <Eye className="size-4 shrink-0" />
                  <span className="hidden lg:inline">Vorschau ({selectedRefIds.size})</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={`h-9 shrink-0 transition-all duration-300 bg-background ${statusFilter === 'draft' ? 'border-primary ring-1 ring-primary' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
                aria-label={statusFilter === 'draft' ? 'Alle Referenzen anzeigen' : 'Nur Entwürfe'}
              >
                <FileTextIcon className="size-4 shrink-0 lg:mr-2" />
                <span className="hidden lg:inline">Entwürfe</span>
              </Button>
              <Button
                size="sm"
                className="h-9 shrink-0 transition-all duration-300"
                onClick={() => setNewRefModalOpen(true)}
                aria-label="Neue Referenz erstellen"
              >
                <PlusCircleIcon className="size-4 shrink-0 lg:mr-2" />
                <span className="hidden lg:inline">Erstellen</span>
              </Button>
            </>
          )}

          {/* Sales: Vorschau-Button wenn Auswahl, dann Warenkorb */}
          {profile.role === 'sales' && selectedRefIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 transition-all duration-300"
              onClick={() => setPreviewRefs(selectedRefs)}
              aria-label={`Vorschau (${selectedRefIds.size} Referenz${selectedRefIds.size !== 1 ? 'en' : ''})`}
            >
              <Eye className="size-4 shrink-0" />
              <span className="hidden lg:inline">Vorschau ({selectedRefIds.size})</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 shrink-0 bg-foreground text-background hover:bg-foreground/90 relative transition-all duration-300"
                aria-label={selectedRefIds.size > 0 ? `Warenkorb (${selectedRefIds.size} Referenzen)` : 'Warenkorb'}
              >
                <ShoppingCartIcon className="size-4" />
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
                    {selectedRefIds.size} Referenz{selectedRefIds.size !== 1 ? 'en' : ''} im Warenkorb
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profile.role === 'sales' && (
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
                      <FileDownIcon className="mr-2 size-4" />
                      Ausgewählte herunterladen
                    </DropdownMenuItem>
                  )}
                  {profile.role === 'admin' && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e: Event) => {
                        e.preventDefault()
                        setBulkDeleteConfirmOpen(true)
                      }}
                    >
                      <Trash2Icon className="mr-2 size-4" />
                      Ausgewählte löschen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedRefIds(new Set())}>
                    Auswahl aufheben
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sicherheitsabfrage: Ausgewählte Referenzen löschen (nur Admin) */}
          {profile.role === 'admin' && (
            <AlertDialog
              open={bulkDeleteConfirmOpen}
              onOpenChange={(open: boolean) => {
                if (!bulkDeleteLoading) setBulkDeleteConfirmOpen(open)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Referenzen löschen</AlertDialogTitle>
                  <AlertDialogDescription>
                    Möchtest du die {selectedRefIds.size} ausgewählten Referenz{selectedRefIds.size !== 1 ? 'en' : ''} wirklich dauerhaft löschen?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkDeleteLoading}>
                    Abbrechen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={bulkDeleteLoading}
                    onClick={async (e: React.MouseEvent) => {
                      e.preventDefault()
                      setBulkDeleteLoading(true)
                      try {
                        const ids = Array.from(selectedRefIds)
                        for (const id of ids) {
                          try {
                            await deleteReference(id)
                          } catch {
                            toast.error('Fehler beim Löschen einer Referenz.')
                            setBulkDeleteLoading(false)
                            setBulkDeleteConfirmOpen(false)
                            return
                          }
                        }
                        const count = ids.length
                        setSelectedRefIds(new Set())
                        setBulkDeleteConfirmOpen(false)
                        toast.success(`${count} Referenz${count !== 1 ? 'en' : ''} gelöscht.`)
                        router.refresh()
                      } finally {
                        setBulkDeleteLoading(false)
                      }
                    }}
                  >
                    {bulkDeleteLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Wird gelöscht…
                      </>
                    ) : (
                      'Dauerhaft löschen'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {rfpFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {rfpFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"
              >
                <span className="max-w-[160px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRfpFileRemove(file.name)}
                  className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-muted-foreground/10 hover:text-foreground"
                  aria-label={`${file.name} entfernen`}
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

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
                            {statusFilter !== 'all' && <Filter className="size-3.5 shrink-0 text-primary" aria-hidden />}
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
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                            {companyFilter !== 'all' && <Filter className="size-3.5 shrink-0 text-primary" aria-hidden />}
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
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                          <ArrowUp className="size-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="size-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                            {tagsFilter !== 'all' && <Filter className="size-3.5 shrink-0 text-primary" aria-hidden />}
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
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                            {industryFilter !== 'all' && <Filter className="size-3.5 shrink-0 text-primary" aria-hidden />}
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
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                            {countryFilter !== 'all' && <Filter className="size-3.5 shrink-0 text-primary" aria-hidden />}
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
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                            {projectStatusFilter !== 'all' && <Filter className="size-3.5 shrink-0 text-primary" aria-hidden />}
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
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
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
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      COLUMN_KEYS.filter((k) => visibleColumns[k]).length + 3
                    }
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 py-2">
                      <p>Keine Referenzen gefunden.</p>
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
                          <Link href="/dashboard/deals/new">
                            <Button className="mt-1">
                              Lege deinen ersten Deal an
                            </Button>
                          </Link>
                          <Link href="/dashboard/deals/new">
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
                        <Badge
                          variant="outline"
                          className={
                            STATUS_BADGE_CLASSES[ref.status] ??
                            'border bg-muted text-foreground'
                          }
                        >
                          {STATUS_LABELS[ref.status] ?? ref.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.company && (
                      <TableCell className="font-medium">{ref.company_name}</TableCell>
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
                      <TableCell>
                        {ref.project_status ? (
                          <Badge variant="outline">
                            {PROJECT_STATUS_LABELS[ref.project_status] ?? ref.project_status}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.project_start && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.project_start ? formatDate(ref.project_start) : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.project_end && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.project_end ? formatDate(ref.project_end) : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.duration_months && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.duration_months != null ? `${ref.duration_months}` : '—'}
                      </TableCell>
                    )}
                    {visibleColumns.created_at && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDate(ref.created_at)}
                      </TableCell>
                    )}
                    {visibleColumns.updated_at && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {ref.updated_at ? formatDate(ref.updated_at) : '—'}
                      </TableCell>
                    )}
                    <TableCell className="pr-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-transparent"
                        onClick={(e: React.MouseEvent) => handleToggleFavorite(ref.id, e)}
                      >
                        <Star
                          className={`size-4 ${
                            ref.is_favorited
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground/50 hover:text-yellow-400'
                          }`}
                        />
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <DropdownMenu
                        open={rowMenuOpenId === ref.id}
                        onOpenChange={(open) => setRowMenuOpenId(open ? ref.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                          >
                            <span className="sr-only">Menü öffnen</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openDetail(ref)}>
                            <FileTextIcon className="mr-2 h-4 w-4" />
                            Details ansehen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => router.push(`/dashboard/edit/${ref.id}`)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
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
                            <CopyIcon className="mr-2 h-4 w-4" />
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
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Papierkorb-Modal */}
      <Dialog
        open={trashOpen}
        onOpenChange={(open) => {
          setTrashOpen(open)
          if (!open) {
            setTrashItems([])
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Papierkorb ({deletedCount})
            </DialogTitle>
            <DialogDescription>
              Gelöschte Referenzen können hier wiederhergestellt oder endgültig entfernt werden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {trashLoading ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Lädt gelöschte Referenzen…
              </div>
            ) : trashItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aktuell befinden sich keine Referenzen im Papierkorb.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
                {trashItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {item.title}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {item.company_name}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={async () => {
                          try {
                            await restoreReference(item.id)
                            setTrashItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            )
                            toast.success('Referenz wiederhergestellt.')
                            router.refresh()
                          } catch {
                            toast.error('Fehler beim Wiederherstellen.')
                          }
                        }}
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          try {
                            await hardDeleteReference(item.id)
                            setTrashItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            )
                            toast.success('Referenz endgültig gelöscht.')
                            router.refresh()
                          } catch {
                            toast.error('Fehler beim endgültigen Löschen.')
                          }
                        }}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {trashItems.length > 0 && (
            <DialogFooter>
              <AlertDialog
                open={confirmEmptyOpen}
                onOpenChange={(open) => {
                  if (!emptyingTrash) setConfirmEmptyOpen(open)
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Papierkorb unwiderruflich leeren?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bist du sicher? Alle {trashItems.length} Referenzen im Papierkorb
                      werden endgültig gelöscht und können nicht wiederhergestellt werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={emptyingTrash}>
                      Abbrechen
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={emptyingTrash}
                      onClick={async (e) => {
                        e.preventDefault()
                        setEmptyingTrash(true)
                        try {
                          const result = await emptyTrash()
                          if (result.success) {
                            toast.success(
                              `Papierkorb geleert (${result.deleted} Referenz${
                                result.deleted !== 1 ? 'en' : ''
                              }).`
                            )
                            setTrashItems([])
                            setConfirmEmptyOpen(false)
                            setTrashOpen(false)
                            router.refresh()
                          } else {
                            toast.error(
                              result.error ?? 'Fehler beim endgültigen Löschen.'
                            )
                          }
                        } catch {
                          toast.error('Fehler beim endgültigen Löschen.')
                        } finally {
                          setEmptyingTrash(false)
                        }
                      }}
                    >
                      {emptyingTrash ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Wird geleert…
                        </>
                      ) : (
                        'Ja, alles löschen'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-2 sm:mt-0"
                disabled={emptyingTrash}
                onClick={() => setConfirmEmptyOpen(true)}
              >
                Papierkorb unwiderruflich leeren
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. Detail (zentrales Modal) – onOpenAutoFocus verhindert Fokus auf Eye-Icon und damit sofortigen Tooltip */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden px-8 py-6 sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl md:px-16 lg:px-20" onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedRef && (
            <TooltipProvider delayDuration={150}>
              {/* Fixierter Header */}
              <DialogHeader className="z-10 shrink-0 border-b bg-background px-0 pb-4 pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg font-semibold leading-tight tracking-tight truncate">
                        {selectedRef.title}
                      </DialogTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 -mt-1 hover:bg-transparent"
                        onClick={(e: React.MouseEvent) => handleToggleFavorite(selectedRef.id, e)}
                      >
                        <Star
                          className={`size-4 ${
                            selectedRef.is_favorited
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground hover:text-yellow-400'
                          }`}
                        />
                      </Button>
                    </div>
                    <DialogDescription className="text-muted-foreground line-clamp-2 text-sm font-medium">
                      {selectedRef.status === 'anonymized'
                        ? 'Anonymisierter Kunde'
                        : selectedRef.company_name}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {selectedRef.is_nda_deal && (
                      <Badge variant="secondary" className="text-xs cursor-default">
                        NDA-geschützt
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={[
                            'text-xs cursor-default',
                            STATUS_BADGE_CLASSES[selectedRef.status] ??
                              'border bg-muted text-foreground',
                          ].join(' ')}
                        >
                          {STATUS_LABELS[selectedRef.status] ?? selectedRef.status}
                        </Badge>
                      </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-snug">
                      {selectedRef.status === 'draft' &&
                        'Entwurf: In Arbeit, nur für den Ersteller sichtbar.'}
                      {selectedRef.status === 'internal_only' &&
                        'Nur Intern: Verifiziert, aber sensible Daten (Preise/Namen) dürfen das Haus nicht verlassen.'}
                      {selectedRef.status === 'approved' &&
                        'Extern freigegeben: Offiziell vom Kunden und Marketing freigegeben für Sales-Pitches.'}
                      {selectedRef.status === 'anonymized' &&
                        'Anonymisiert: Name und Logo entfernt (z. B. „Großbank“), bereit für öffentliche Case Studies.'}
                    </TooltipContent>
                  </Tooltip>
                  </div>
                </div>
                {/* Nutzungs-Statistik unter Freigabestufe: Views + Verknüpfungen */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1.5">
                    <Eye className="size-3.5" aria-hidden />
                    {formatNumber(selectedRef.total_share_views ?? 0)} Aufrufe
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1.5">
                        <LinkIcon className="size-3.5" aria-hidden />
                        {(selectedRef.deal_link_count ?? 0) + (selectedRef.share_link_count ?? 0)} Verknüpfungen
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {selectedRef.deal_link_count ?? 0}× mit Deal verknüpft · {(selectedRef.share_link_count ?? 0)}× Kundenlink erstellt
                    </TooltipContent>
                  </Tooltip>
                </div>
              </DialogHeader>

              {/* Ein scrollbarer Bereich: gleiche 4-Karten-Struktur wie Referenz erstellen */}
              <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
                <div className="space-y-6 pt-4">
                  {/* Card 1: Story (Herausforderung & Lösung + Tags) */}
                  <Card>
                    <CardContent className="space-y-4">
                      {(selectedRef.customer_challenge || selectedRef.our_solution) ? (
                        <div className="space-y-4">
                          {selectedRef.customer_challenge ? (
                            <div className="space-y-2">
                              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Herausforderung des Kunden</span>
                              <p className="text-foreground text-sm leading-relaxed">
                                {selectedRef.customer_challenge}
                              </p>
                            </div>
                          ) : null}
                          {selectedRef.our_solution ? (
                            <div className="space-y-2">
                              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Unsere Lösung</span>
                              <p className="text-foreground text-sm leading-relaxed">
                                {selectedRef.our_solution}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <TagIcon className="size-3" /> Tags
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRef.tags
                            ? selectedRef.tags
                                .split(/[\s,]+/)
                                .map((tag) => normalizeTagLabel(tag))
                                .filter(Boolean)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))
                            : (
                              <span className="text-xs font-medium text-muted-foreground">—</span>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Projektdetails (Volumen, Vertragsart, Zeitraum, Unternehmensdetails, Kontakte) */}
                  <Card>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Projektdetails</span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <FileTextIcon className="size-3" /> Volumen (€)
                        </span>
                        <p className={`pl-4 text-xs font-medium ${selectedRef.volume_eur ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {selectedRef.volume_eur ? formatNumber(selectedRef.volume_eur) : '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <FileTextIcon className="size-3" /> Vertragsart
                        </span>
                        <p className={`pl-4 text-xs font-medium ${selectedRef.contract_type ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {selectedRef.contract_type || '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <CalendarIcon className="size-3" /> Projektstart
                        </span>
                        <p className={`pl-4 text-xs font-medium ${selectedRef.project_start ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {selectedRef.project_start ? formatDate(selectedRef.project_start) : '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <TimerIcon className="size-3" /> Projektende / Dauer
                        </span>
                        {(() => {
                          const start = selectedRef.project_start
                          const end = selectedRef.project_end
                          const status = selectedRef.project_status
                          const label =
                            status === 'active'
                              ? 'Aktiv'
                              : end
                                ? formatDate(end)
                                : '—'
                          const nowIso = new Date().toISOString()
                          const duration =
                            selectedRef.duration_months != null
                              ? selectedRef.duration_months
                              : start && end
                                ? diffMonthsUtc(start, end)
                                : status === 'active' && start
                                  ? diffMonthsUtc(start, nowIso)
                                  : null
                          return (
                            <p className="pl-4 text-xs font-medium text-foreground">
                              {duration != null ? `${label} (${duration} Monate)` : label}
                            </p>
                          )
                        })()}
                      </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <Building2Icon className="size-3" /> Aktueller Dienstleister
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.incumbent_provider ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.incumbent_provider || '—'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <Users className="size-3" /> Beteiligte Wettbewerber
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.competitors ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.competitors || '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <hr className="border-border/60" />

                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Unternehmensdetails</span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <Building2Icon className="size-3" /> Industrie
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.industry ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.industry || '—'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <MapPinIcon className="size-3" /> HQ
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.country ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.country || '—'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <GlobeIcon className="size-3" /> Website
                            </span>
                            <div className="pl-4">
                              {selectedRef.website ? (
                                <a
                                  href={selectedRef.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-medium"
                                >
                                  Öffnen <ExternalLinkIcon className="size-3" />
                                </a>
                              ) : (
                                <p className="text-xs font-medium text-muted-foreground">—</p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <UserIcon className="size-3" /> Mitarbeiter
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.employee_count != null ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {formatNumber(selectedRef.employee_count)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <hr className="border-border/60" />

                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Kontakte</span>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <UserIcon className="size-3" /> Interner Ansprechpartner
                            </span>
                        <p className="pl-4 text-xs font-medium">
                          {selectedRef.contact_display ||
                            selectedRef.contact_email ||
                            'Nicht zugewiesen'}
                        </p>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-4">
                          {selectedRef.contact_email && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a href={`mailto:${selectedRef.contact_email}`} className="inline-flex items-center gap-1 text-[10px] hover:underline">
                                  <Mail className="size-3.5" />
                                  {selectedRef.contact_email}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>E-Mail: {selectedRef.contact_email}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-muted-foreground pl-4 text-[10px]">
                          Account Owner
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <UserIcon className="size-3" /> Kundenansprechpartner
                        </span>
                        {(() => {
                          const ext = selectedRef.customer_contact_id
                            ? externalContacts?.find((c) => c.id === selectedRef.customer_contact_id)
                            : undefined
                          const displayName = selectedRef.customer_contact || (ext ? [ext.first_name, ext.last_name].filter(Boolean).join(' ') : null) || '—'
                          const email = ext?.email ?? null
                          const phone = ext?.phone ?? null
                          const role = ext?.role ?? null
                          return (
                            <>
                              <p className={`pl-4 text-xs font-medium ${displayName !== '—' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {displayName}
                              </p>
                              <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-4">
                                {email && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-[10px] hover:underline">
                                        <Mail className="size-3.5" />
                                        {email}
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>E-Mail: {email}</TooltipContent>
                                  </Tooltip>
                                )}
                                {phone && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-[10px] hover:underline">
                                        <Phone className="size-3.5" />
                                        {phone}
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>Telefon: {phone}</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              {role && (
                                <p className="text-muted-foreground pl-4 text-[10px]">
                                  {role}
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Strategie & Anhänge (Dateien, Historie) */}
                  <Card className="bg-muted/30">
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                          Dateien
                        </span>
                    {detailAssetsLoading ? (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
                        Dateien werden geladen…
                      </div>
                    ) : detailAssets.length === 0 && !selectedRef.file_path ? (
                      <div className="text-muted-foreground bg-muted/10 flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
                        <span>📎</span>
                        <p>Keine Dateien vorhanden.</p>
                      </div>
                    ) : (
                      <Tabs defaultValue="sales" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="sales">Sales Material</TabsTrigger>
                          <TabsTrigger value="contract">Verträge</TabsTrigger>
                          <TabsTrigger value="other">Sonstiges</TabsTrigger>
                        </TabsList>
                        {(['sales', 'contract', 'other'] as const).map((cat) => {
                          const legacyFile =
                            cat === 'other' && detailAssets.length === 0 && selectedRef.file_path
                              ? { path: selectedRef.file_path, name: selectedRef.file_path.split('/').pop() ?? 'Dokument', isLegacy: true as const }
                              : null
                          const assetsInCat = detailAssets.filter((a) => a.category === cat)
                          const hasLegacy = !!legacyFile
                          const hasItems = assetsInCat.length > 0 || hasLegacy
                          return (
                            <TabsContent key={cat} value={cat} className="mt-2">
                              {!hasItems ? (
                                <p className="text-muted-foreground py-4 text-center text-sm">Keine Dateien in dieser Kategorie.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {legacyFile && (
                                    <li className="flex items-center justify-between gap-2 rounded-lg border p-3">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate text-sm">{legacyFile.name}</span>
                                      </div>
                                      <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                                        <a
                                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${legacyFile.path}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLinkIcon className="mr-1 size-3" /> Öffnen
                                        </a>
                                      </Button>
                                    </li>
                                  )}
                                  {assetsInCat.map((asset) => (
                                    <li
                                      key={asset.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate text-sm">{asset.file_name || asset.file_path.split('/').pop() || 'Dokument'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {profile.role === 'admin' && (
                                          <Select
                                            value={asset.category}
                                            onValueChange={async (value: 'sales' | 'contract' | 'other') => {
                                              const res = await updateReferenceAssetCategory(asset.id, value)
                                              if (res.success) {
                                                setDetailAssets((prev) =>
                                                  prev.map((a) => (a.id === asset.id ? { ...a, category: value } : a))
                                                )
                                                toast.success('Kategorie aktualisiert.')
                                              } else {
                                                toast.error(res.error ?? 'Fehler beim Aktualisieren.')
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="h-8 w-[130px] text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="sales">Sales Material</SelectItem>
                                              <SelectItem value="contract">Verträge</SelectItem>
                                              <SelectItem value="other">Sonstiges</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                        <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                                          <a
                                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${asset.file_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <ExternalLinkIcon className="mr-1 size-3" /> Öffnen
                                          </a>
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    )}
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Historie</span>
                        <div className="relative ml-1.5 space-y-4 border-l pl-4">
                          <div className="relative">
                            <span className="bg-primary ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
                            <p className="text-xs font-medium">Referenz erstellt</p>
                            <p className="text-muted-foreground mt-1 text-[10px]">
                              {formatDate(selectedRef.created_at)}
                            </p>
                          </div>
                          {selectedRef.updated_at && selectedRef.updated_at !== selectedRef.created_at && (
                            <div className="relative">
                              <span className="bg-muted-foreground/50 ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
                              <p className="text-xs font-medium">Letzte Änderung</p>
                              <p className="text-muted-foreground mt-1 text-[10px]">
                                {formatDate(selectedRef.updated_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Fixierter Footer (rollenabhängig) */}
              <DialogFooter className="z-10 shrink-0 flex-col gap-2 border-t bg-muted/20 px-0 pt-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
                {/* Linke Seite: Download + Bearbeiten */}
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    asChild
                    disabled={!selectedRef.file_path}
                  >
                    <a
                      href={
                        selectedRef.file_path
                          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${selectedRef.file_path}`
                          : '#'
                      }
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!selectedRef.file_path) {
                          e.preventDefault()
                          toast.error('Kein PDF vorhanden.')
                        }
                      }}
                    >
                      <FileDownIcon className="mr-2 size-4" />
                      Download
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShareLinkPopoverRef(selectedRef)}
                    title="Kundenlink erstellen"
                  >
                    <LinkIcon className="mr-2 size-4" /> Kundenlink erstellen
                  </Button>
                  {profile.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/dashboard/edit/${selectedRef.id}`)
                      }
                    >
                      <Pencil className="mr-2 size-4" /> Bearbeiten
                    </Button>
                  )}
                </div>

                {/* Rechte Seite: Freigabe anfragen / Account Owner + Löschen ganz rechts */}
                <div className="flex w-full justify-end gap-2 sm:w-auto">
                  {profile.role === 'sales' &&
                    selectedRef.status === 'internal_only' && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRequestSpecificApproval(selectedRef.id)
                        }
                      >
                        <Send className="mr-2 size-4" /> Freigabe anfragen
                      </Button>
                    )}
                  {profile.role === 'admin' &&
                    selectedRef.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmitForApproval(selectedRef.id)}
                      >
                        <Mail className="mr-2 size-4" /> Freigabe anfragen
                      </Button>
                    )}
                  {profile.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e: React.MouseEvent) => handleDelete(selectedRef.id, e)}
                    >
                      <Trash2Icon className="mr-2 size-4" /> Löschen
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>

      {/* Kundenlink-Popover: Link erstellen / anzeigen + Copy + ReferenceReader-Vorschau */}
      <Dialog
        open={shareLinkPopoverRef !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShareLinkPopoverRef(null)
            setShareLinkUrl(null)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="z-[60] max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
        >
          <div className="flex flex-col">
            <div className="preview-modal-scroll overflow-y-auto p-8 md:p-16 lg:p-24">
              <div className="mx-auto max-w-2xl space-y-6">
                <h3 className="text-lg font-semibold">Kundenlink erstellen</h3>
                <div className="space-y-3">
                  {shareLinkLoading ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin" /> Wird geladen…
                    </p>
                  ) : shareLinkUrl ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareLinkUrl!)
                          toast.success('Link in Zwischenablage kopiert')
                        } catch {
                          toast.error('Kopieren fehlgeschlagen')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigator.clipboard.writeText(shareLinkUrl!).then(
                            () => toast.success('Link in Zwischenablage kopiert'),
                            () => toast.error('Kopieren fehlgeschlagen')
                          )
                        }
                      }}
                      className="bg-muted/50 hover:bg-muted border-muted-foreground/20 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                      title="Klicken zum Kopieren"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-foreground">{shareLinkUrl}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">Klicken zum Kopieren</span>
                    </div>
                  ) : (
                    <Button
                      disabled={shareLinkGenerateLoading}
                      onClick={async () => {
                        if (!shareLinkPopoverRef) return
                        setShareLinkGenerateLoading(true)
                        try {
                          const result = await createSharedPortfolio([shareLinkPopoverRef.id])
                          if (result.success) {
                            setShareLinkUrl(result.url)
                            toast.success('Kundenlink erstellt')
                          } else {
                            toast.error(result.error ?? 'Erstellen fehlgeschlagen')
                          }
                        } finally {
                          setShareLinkGenerateLoading(false)
                        }
                      }}
                    >
                      {shareLinkGenerateLoading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <LinkIcon className="mr-2 size-4" />
                      )}
                      Link erstellen
                    </Button>
                  )}
                </div>
                {shareLinkPopoverRef && (
                  <div className="pt-4">
                    <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
                      Kundenansicht (Vorschau)
                    </p>
                    <ReferenceReader ref={shareLinkPopoverRef} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 justify-center border-t bg-muted/30 px-8 py-4 md:px-16 lg:px-24">
              <Button
                variant="outline"
                onClick={() => {
                  setShareLinkPopoverRef(null)
                  setShareLinkUrl(null)
                }}
              >
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portfolio-/Reader-Vorschau (Full-Screen): fixed inset-0, kein Springen; Header/Footer fix, nur Story scrollt */}
      <Dialog
        open={previewRefs !== null && previewRefs.length > 0}
        onOpenChange={(open) => !open && setPreviewRefs(null)}
      >
        <DialogContent showCloseButton={false} className="fixed inset-0 z-50 flex flex-col rounded-none border-0 p-0 overflow-hidden bg-background !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !w-full !h-full">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 items-center justify-between border-b bg-background px-6 py-4">
              <h2 className="text-lg font-semibold">
                {previewRefs && previewRefs.length > 1
                  ? `Portfolio-Vorschau (${previewRefs.length} Referenzen)`
                  : 'Vorschau – Kundenansicht'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewRefs(null)}
                aria-label="Schließen"
              >
                <XIcon className="size-5" />
              </Button>
            </header>
            <div className="preview-modal-scroll flex-1 min-h-0 overflow-y-auto p-8 md:p-16 lg:p-24 space-y-20 max-w-[100vw]">
              {previewRefs?.map((ref) => (
                <ReferenceReader key={ref.id} ref={ref} />
              ))}
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t bg-muted/30 px-6 py-4">
              <Button variant="outline" size="sm" disabled className="opacity-70">
                PDF Export (Coming Soon)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.href : ''
                  void navigator.clipboard?.writeText(url).then(() => toast.success('Link in Zwischenablage kopiert.'))
                }}
              >
                <CopyIcon className="mr-2 size-4" />
                Link teilen
              </Button>
            </footer>
          </div>
        </DialogContent>
      </Dialog>

      {/* Neue Referenz (zentrales Modal) – breites Layout, mehr White Space */}
      {profile.role === 'admin' && (
        <Dialog open={newRefModalOpen} onOpenChange={setNewRefModalOpen}>
          <DialogContent className="max-h-[90vh] min-h-[60vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-[90vw] lg:max-w-7xl gap-0 border-0 px-6 py-6 md:px-12 md:py-10 lg:px-16 lg:py-12">
            <div className="flex flex-col items-center w-full max-w-full">
              <ReferenceForm
                companies={companies}
                contacts={contacts}
                externalContacts={externalContacts}
                onSuccess={() => setNewRefModalOpen(false)}
                onClose={() => setNewRefModalOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk-Import-Modal (nur Admin) */}
      {profile.role === 'admin' && (
        <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
          <DialogContent className="sm:max-w-lg" showCloseButton={!bulkImportLoading}>
            <DialogHeader>
              <DialogTitle>Referenzen importieren</DialogTitle>
              <DialogDescription>
                Bis zu 20 Dateien ablegen. Pro Gruppe wird eine Referenz mit mehreren Assets angelegt. Ziehe Dateikarten auf eine andere, um sie zu einer Projekt-Gruppe zu bündeln.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input
                ref={bulkImportDropRef}
                type="file"
                multiple
                accept=".pdf,.pptx,.ppt"
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : []
                  addBulkImportFiles(list)
                  e.target.value = ''
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => !bulkImportLoading && bulkImportDropRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !bulkImportLoading && bulkImportDropRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (bulkImportLoading) return
                  const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []
                  addBulkImportFiles(list)
                }}
                className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-60"
              >
                <UploadIcon className="size-8" />
                <span>Dateien hier ablegen oder klicken (max. 20)</span>
              </div>
              {bulkImportGroups.length > 0 && (
                <div className="max-h-[280px] space-y-3 overflow-y-auto">
                  {bulkImportGroups.map((group, groupIndex) => (
                    <div
                      key={group.id}
                      className="rounded-lg border border-border bg-muted/10 p-3"
                    >
                      <label className="mb-2 block text-xs font-medium text-muted-foreground">
                        Projektname
                      </label>
                      <Input
                        value={group.projectName}
                        onChange={(e) => setBulkImportGroupName(group.id, e.target.value)}
                        disabled={bulkImportLoading}
                        className="mb-2 h-8 text-sm"
                        placeholder="Name der Referenz"
                      />
                      <div className="flex flex-wrap gap-2">
                        {group.files.map((file, fileIndex) => (
                          <div
                            key={`${group.id}-${fileIndex}-${file.name}`}
                            draggable={!bulkImportLoading}
                            onDragStart={(e: React.DragEvent) => {
                              if (bulkImportLoading) return
                              e.dataTransfer.setData('text/plain', `${groupIndex}-${fileIndex}`)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragOver={(e: React.DragEvent) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                            }}
                            onDrop={(e: React.DragEvent) => {
                              e.preventDefault()
                              if (bulkImportLoading) return
                              const raw = e.dataTransfer.getData('text/plain')
                              const [fromGi, fromFi] = raw.split('-').map(Number)
                              if (Number.isFinite(fromGi) && Number.isFinite(fromFi) && (fromGi !== groupIndex || fromFi !== fileIndex)) {
                                moveFileToGroup(fromGi, fromFi, groupIndex)
                              }
                            }}
                            className="flex cursor-grab items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm shadow-sm active:cursor-grabbing"
                          >
                            <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="max-w-[140px] truncate">{file.name}</span>
                            <button
                              type="button"
                              disabled={bulkImportLoading}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                removeBulkImportFile(group.id, fileIndex)
                              }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label={`${file.name} entfernen`}
                            >
                              <XIcon className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={bulkImportLoading}
                onClick={() => setBulkImportOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                disabled={totalBulkImportFiles === 0 || bulkImportLoading}
                onClick={async () => {
                  setBulkImportLoading(true)
                  try {
                    const formData = new FormData()
                    formData.append(
                      'groups',
                      JSON.stringify(
                        bulkImportGroups.map((g) => ({
                          projectName: g.projectName,
                          fileCount: g.files.length,
                        }))
                      )
                    )
                    bulkImportGroups.forEach((g) => {
                      g.files.forEach((f) => formData.append('files', f))
                    })
                    const result = await bulkCreateReferencesFromFiles(formData)
                    if (result.success) {
                      toast.success(`${result.created} Referenz${result.created !== 1 ? 'en' : ''} (Entwürfe) erfolgreich erstellt.`)
                      setBulkImportOpen(false)
                      setBulkImportGroups([])
                      router.refresh()
                    } else {
                      toast.error(result.error)
                    }
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
                  } finally {
                    setBulkImportLoading(false)
                  }
                }}
              >
                {bulkImportLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Import läuft…
                  </>
                ) : (
                  `Import starten (${bulkImportGroups.length} Gruppe${bulkImportGroups.length !== 1 ? 'n' : ''}, ${totalBulkImportFiles} Dateien)`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
