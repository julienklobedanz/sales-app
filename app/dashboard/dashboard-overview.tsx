'use client'

import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
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
import type { ReferenceRow, ReferenceAssetRow } from './actions'
import {
  bulkCreateReferencesFromFiles,
  deleteReference,
  getReferenceAssets,
  hardDeleteReference,
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
  MoreHorizontal,
  CopyIcon,
  FileTextIcon,
  SearchIcon as Search,
  HandshakeIcon as Handshake,
  RocketIcon as Rocket,
  CheckCircle,
  Send,
  Mail,
  Star,
  XIcon,
  FileDownIcon,
  UploadIcon,
  Loader2,
  ShoppingCartIcon,
} from 'lucide-react'
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

// --- Konstanten & Hilfsfunktionen ---

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  pending: 'In Prüfung',
  external: 'Extern Frei',
  internal: 'Nur Intern',
  anonymous: 'Anonym',
  restricted: 'Eingeschränkt',
}

const STATUS_BADGE_VARIANT: Record<
  string,
  'secondary' | 'outline' | 'default'
> = {
  draft: 'secondary',
  pending: 'outline',
  external: 'default',
  internal: 'outline',
  anonymous: 'outline',
  restricted: 'outline',
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  completed: 'Abgeschlossen',
}

/** Spalten-Keys und Standard-Sichtbarkeit: nur Status, Unternehmen, Titel, Tags, Projektstatus, Letzte Änderung */
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
  country: 'Land',
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
  if (status === 'pending') return 'approval'
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

export function DashboardOverview({
  references: initialReferences,
  totalCount,
  deletedCount,
  profile,
  title = 'Referenzen',
  initialFavoritesOnly = false,
  initialStatusFilter = 'all',
  viewMode = 'active',
}: {
  references: ReferenceRow[]
  totalCount: number
  deletedCount: number
  profile: Profile
  title?: string
  initialFavoritesOnly?: boolean
  initialStatusFilter?: string
  viewMode?: 'active' | 'trash'
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter)
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly)
  const [rfpFiles, setRfpFiles] = useState<File[]>([])
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

  const isTrashView = viewMode === 'trash'

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
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof COLUMN_KEYS)[number], boolean>
  >(DEFAULT_VISIBLE)

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await toggleFavorite(id)
      toast.success('Favoriten aktualisiert')
      router.refresh()
    } catch {
      toast.error('Fehler beim Aktualisieren der Favoriten')
    }
  }

  // Client-seitiges Filtering (Sales: draft nie anzeigen; optional nur Favoriten)
  const filteredReferences = useMemo(() => {
    let list = initialReferences
    if (profile.role === 'sales' && !isTrashView) {
      list = list.filter((r) => r.status !== 'draft')
    }
    if (favoritesOnly && !isTrashView) {
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
    return list
  }, [initialReferences, profile.role, search, statusFilter, favoritesOnly])

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

  const handleRestoreSelected = async () => {
    const ids = Array.from(selectedRefIds)
    if (!ids.length) return
    try {
      for (const id of ids) {
        await restoreReference(id)
      }
      toast.success(
        `${ids.length} Referenz${ids.length !== 1 ? 'en' : ''} wiederhergestellt.`
      )
      setSelectedRefIds(new Set())
      router.refresh()
    } catch {
      toast.error('Fehler beim Wiederherstellen der Referenzen.')
    }
  }

  const handleHardDeleteSelected = async () => {
    const ids = Array.from(selectedRefIds)
    if (!ids.length) return
    try {
      for (const id of ids) {
        await hardDeleteReference(id)
      }
      toast.success(
        `${ids.length} Referenz${ids.length !== 1 ? 'en' : ''} endgültig gelöscht.`
      )
      setSelectedRefIds(new Set())
      router.refresh()
    } catch {
      toast.error('Fehler beim endgültigen Löschen der Referenzen.')
    }
  }

  const selectedRefs = useMemo(
    () => initialReferences.filter((r) => selectedRefIds.has(r.id)),
    [initialReferences, selectedRefIds]
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
  }

  const handleRfpFileRemove = (name: string) => {
    setRfpFiles((prev) => prev.filter((file) => file.name !== name))
  }

  const handleRfpDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handleRfpFilesAdd(event.dataTransfer.files)
  }

  const handleRfpDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="flex flex-col space-y-8 pt-6">
      {/* 1. Header: Referenzen (Einstieg für beide Rollen) */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      </div>

      {/* 2. Toolbar & Tabelle */}
      <div className="space-y-4">
        {/* Ansicht-Filter: Aktiv / Papierkorb */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 p-1">
            <Button
              type="button"
              variant={!isTrashView ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => {
                if (isTrashView) {
                  router.push('/dashboard')
                }
              }}
            >
              Aktive Referenzen
            </Button>
            {deletedCount > 0 && (
              <Button
                type="button"
                variant={isTrashView ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  if (!isTrashView) {
                    router.push('/dashboard?papierkorb=1')
                  }
                }}
              >
                Papierkorb ({deletedCount})
              </Button>
            )}
          </div>
          {isTrashView && selectedRefIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleRestoreSelected}
              >
                Wiederherstellen
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={handleHardDeleteSelected}
              >
                Endgültig löschen
              </Button>
            </div>
          )}
        </div>
        {/* Toolbar: Suche füllt Platz, daneben Dropzone, Status, Favoriten, Spalten (und ggf. Button) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
          {/* Suche nimmt restlichen Platz; rechts davon Dropzone & Filter */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Referenzen suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>

          {/* RFP-Abgleich */}
          <div
            className="h-9 w-[120px] shrink-0 cursor-pointer rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted flex items-center justify-center text-center"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleRfpDrop}
            onDragOver={handleRfpDragOver}
          >
            <span className="truncate">
              {rfpFiles.length === 0
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[120px] shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status</SelectItem>
              <SelectItem value="draft">Entwurf</SelectItem>
              <SelectItem value="pending">In Prüfung</SelectItem>
              <SelectItem value="external">Extern frei</SelectItem>
              <SelectItem value="internal">Intern frei</SelectItem>
              <SelectItem value="anonymous">Anonym</SelectItem>
              <SelectItem value="restricted">Eingeschränkt</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Spalten
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
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                        visibleColumns[column] ? 'bg-primary border-primary' : ''
                      }`}
                    >
                      {visibleColumns[column] && (
                        <CheckCircle className="h-3 w-3 text-white" />
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
            className="h-9 shrink-0"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className={`mr-2 size-4 ${favoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            Favoriten
          </Button>

          {/* Admin: Importieren, Erstellen */}
          {profile.role === 'admin' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => {
                  setBulkImportGroups([])
                  setBulkImportOpen(true)
                }}
              >
                <UploadIcon className="mr-2 size-4" />
                Importieren
              </Button>
              <Link href="/dashboard/new">
                <Button size="sm" className="h-9 shrink-0">
                  <PlusCircleIcon className="mr-2 size-4" />
                  Erstellen
                </Button>
              </Link>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 shrink-0 bg-foreground text-background hover:bg-foreground/90 relative"
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

        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]"></TableHead>
                {visibleColumns.status && <TableHead>{COLUMN_LABELS.status}</TableHead>}
                {visibleColumns.company && <TableHead className="w-[180px]">{COLUMN_LABELS.company}</TableHead>}
                {visibleColumns.title && <TableHead>{COLUMN_LABELS.title}</TableHead>}
                {visibleColumns.tags && <TableHead className="max-w-[120px]">{COLUMN_LABELS.tags}</TableHead>}
                {visibleColumns.industry && <TableHead>{COLUMN_LABELS.industry}</TableHead>}
                {visibleColumns.country && <TableHead>{COLUMN_LABELS.country}</TableHead>}
                {visibleColumns.project_status && <TableHead>{COLUMN_LABELS.project_status}</TableHead>}
                {visibleColumns.project_start && <TableHead className="text-right">{COLUMN_LABELS.project_start}</TableHead>}
                {visibleColumns.project_end && <TableHead className="text-right">{COLUMN_LABELS.project_end}</TableHead>}
                {visibleColumns.duration_months && <TableHead className="text-right">{COLUMN_LABELS.duration_months}</TableHead>}
                {visibleColumns.created_at && <TableHead className="text-right">{COLUMN_LABELS.created_at}</TableHead>}
                {visibleColumns.updated_at && <TableHead className="text-right">{COLUMN_LABELS.updated_at}</TableHead>}
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
                      {search.trim() &&
                        profile.role === 'admin' && (
                          <Link href="/dashboard/new">
                            <Button className="mt-1">
                              Erstelle deine erste Referenz
                            </Button>
                          </Link>
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
                        <Badge variant={STATUS_BADGE_VARIANT[ref.status] ?? 'outline'}>
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
                              .split(',')
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
                      <DropdownMenu>
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

      {/* 4. Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl md:w-[640px] md:max-w-[640px] lg:w-[720px]">
          {selectedRef && (
            <TooltipProvider delayDuration={150}>
              {/* Fixierter Header */}
              <SheetHeader className="z-10 border-b bg-background px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-lg font-semibold leading-tight tracking-tight truncate">
                        {selectedRef.title}
                      </SheetTitle>
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
                    <SheetDescription className="text-muted-foreground line-clamp-2 text-xs">
                      {selectedRef.company_name}
                    </SheetDescription>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[selectedRef.status] ?? 'outline'}
                        className="shrink-0 text-xs cursor-default"
                      >
                        {STATUS_LABELS[selectedRef.status] ?? selectedRef.status}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-snug">
                      {selectedRef.status === 'draft' &&
                        'Entwurf: nur intern in deiner Firma sichtbar, nicht für Sales; Referenz ist noch in Bearbeitung.'}
                      {selectedRef.status === 'pending' &&
                        'In Prüfung: für Sales sichtbar; kann individuell beim Account Owner zur Freigabe angefragt werden.'}
                      {selectedRef.status === 'anonymous' &&
                        'Anonymisiert: Referenz darf genutzt werden, jedoch ohne Nennung des Kundennamens oder Kontaktangaben.'}
                      {selectedRef.status === 'restricted' &&
                        'Beschränkt: Für jede Nutzung ist eine Einzelfreigabe durch den Account Owner beim Kunden nötig.'}
                      {selectedRef.status === 'external' &&
                        'Extern: Vollständig freigegeben, für alle Bids nutzbar; der genannte Ansprechpartner steht für Referenzcalls bereit.'}
                      {selectedRef.status === 'internal' &&
                        'Intern: Nur intern im Unternehmen sichtbar und nutzbar, nicht extern teilbar.'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SheetHeader>

              {/* Ein scrollbarer Bereich: Übersicht, Dateien, Historie untereinander */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Abstand zwischen Abschnitten: space-y-8 | Abstand innerhalb Abschnitt: space-y-4 | Mehr Abstand oben vor Übersicht: pt-6 */}
                <div className="space-y-8 pt-6">
                  {/* Freigabestatus */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Freigabestatus
                    </h3>
                    <div className="rounded-lg border bg-muted/10 p-4">
                      <ApprovalStepper
                        status={selectedRef.status}
                        accountOwner={
                          selectedRef.contact_display || selectedRef.contact_email
                        }
                      />
                    </div>
                  </section>

                  {/* Übersicht */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Übersicht
                    </h3>
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {selectedRef.summary ||
                          'Keine Zusammenfassung hinterlegt.'}
                      </p>
                    </div>
                    {(selectedRef.customer_challenge || selectedRef.our_solution) && (
                      <div className="rounded-lg border border-amber-200/50 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-950/20 p-4 space-y-3">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                          Storytelling
                        </p>
                        {selectedRef.customer_challenge && (
                          <div>
                            <p className="text-muted-foreground text-[11px] font-medium mb-0.5">Herausforderung des Kunden</p>
                            <p className="text-foreground text-sm leading-relaxed">
                              {selectedRef.customer_challenge}
                            </p>
                          </div>
                        )}
                        {selectedRef.our_solution && (
                          <div>
                            <p className="text-muted-foreground text-[11px] font-medium mb-0.5">Unsere Lösung</p>
                            <p className="text-foreground text-sm leading-relaxed">
                              {selectedRef.our_solution}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <TagIcon className="size-3" /> Tags
                        </span>
                        <div className="flex flex-wrap gap-1.5 pl-4">
                          {selectedRef.tags
                            ? selectedRef.tags
                                .split(',')
                                .map((tag) => tag.trim())
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
                              <span className="text-xs font-medium text-foreground">—</span>
                            )}
                        </div>
                      </div>

                      {/* Row 1 */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <Building2Icon className="size-3" /> Industrie
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.industry || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <MapPinIcon className="size-3" /> HQ
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.country || '—'}
                        </p>
                      </div>

                      {/* Row 2 */}
                      <div className="space-y-1">
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
                            <p className="text-foreground text-xs font-medium">—</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <UserIcon className="size-3" /> Mitarbeiteranzahl
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.employee_count != null
                            ? `${selectedRef.employee_count}`
                            : '—'}
                        </p>
                      </div>

                      {/* Row 3 */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <CalendarIcon className="size-3" /> Projektstart
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.project_start ? formatDate(selectedRef.project_start) : '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
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
                            <p className="text-foreground pl-4 text-xs font-medium">
                              {duration != null ? `${label} (${duration} Monate)` : label}
                            </p>
                          )
                        })()}
                      </div>

                      {/* Row 4 */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <FileTextIcon className="size-3" /> Volumen (€)
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.volume_eur || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <FileTextIcon className="size-3" /> Vertragsart
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.contract_type || '—'}
                        </p>
                      </div>

                      {/* Incumbent & Wettbewerber */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <Building2Icon className="size-3" /> Incumbent
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.incumbent_provider || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <Handshake className="size-3" /> Wettbewerber
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.competitors || '—'}
                        </p>
                      </div>

                      {/* Row 5 */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <HistoryIcon className="size-3" /> Letzte Änderung
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.updated_at ? formatDate(selectedRef.updated_at) : '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <CalendarIcon className="size-3" /> Erstellt
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {formatDate(selectedRef.created_at)}
                        </p>
                      </div>
                    </div>
                    <Separator className="!my-4" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <UserIcon className="size-3" /> Interner Kontakt
                        </span>
                        <p className="pl-4 text-xs font-medium">
                          {selectedRef.contact_display ||
                            selectedRef.contact_email ||
                            'Nicht zugewiesen'}
                        </p>
                        <p className="text-muted-foreground pl-4 text-[10px]">
                          Account Owner
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <UserIcon className="size-3" /> Kundenansprechpartner
                        </span>
                        <p className="pl-4 text-xs font-medium">
                          {selectedRef.customer_contact || '—'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Dateien (Assets nach Kategorie) */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Dateien
                    </h3>
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
                  </section>

                  {/* Historie */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Historie
                    </h3>
                    <div className="relative ml-1.5 space-y-4 border-l pl-4">
                      <div className="relative">
                        <span className="bg-primary ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
                        <p className="text-xs font-medium">Referenz erstellt</p>
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {formatDate(selectedRef.created_at)}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Fixierter Footer (rollenabhängig) */}
              <SheetFooter className="z-10 flex-col gap-2 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                    (selectedRef.status === 'restricted' ||
                      selectedRef.status === 'internal') && (
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
              </SheetFooter>
            </TooltipProvider>
          )}
        </SheetContent>
      </Sheet>

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
