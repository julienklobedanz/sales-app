'use client'

import { useMemo, useRef, useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import type { ReferenceRow } from './actions'
import { deleteReference, submitForApproval, toggleFavorite } from './actions'
import type { Profile } from './dashboard-shell'
import {
  PlusCircleIcon,
  SlidersHorizontal,
  PencilIcon,
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
  SearchIcon,
  CheckCircle,
  Send,
  Mail,
  Star,
  XIcon,
  FileDownIcon,
} from 'lucide-react'
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

// --- Hauptkomponente ---

export function DashboardOverview({
  references: initialReferences,
  totalCount,
  profile,
  title = 'Referenzen',
  initialFavoritesOnly = false,
  initialStatusFilter = 'all',
}: {
  references: ReferenceRow[]
  totalCount: number
  profile: Profile
  title?: string
  initialFavoritesOnly?: boolean
  initialStatusFilter?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter)
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly)
  const [rfpFiles, setRfpFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedRef, setSelectedRef] = useState<ReferenceRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
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
    return list
  }, [initialReferences, profile.role, search, statusFilter, favoritesOnly])

  const openDetail = (ref: ReferenceRow) => {
    setSelectedRef(ref)
    setSheetOpen(true)
  }

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
        {/* Toolbar: Suche füllt Platz, daneben Dropzone, Status, Favoriten, Spalten (und ggf. Button) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
          {/* Suche nimmt restlichen Platz; rechts davon Dropzone & Filter */}
          <div className="relative flex-1 min-w-0">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Referenzen suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>

          {/* Temporäre Dropzone für RFP-Dokumente */}
          <div
            className="h-9 w-[180px] shrink-0 cursor-pointer rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted flex items-center justify-center text-center"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleRfpDrop}
            onDragOver={handleRfpDragOver}
          >
            <span className="truncate">
              {rfpFiles.length === 0
                ? 'RFP-Dateien hier ablegen'
                : `${rfpFiles.length} RFP-Datei${rfpFiles.length > 1 ? 'en' : ''} ausgewählt`}
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
            <SelectTrigger className="h-9 w-[140px] shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="draft">Entwurf</SelectItem>
              <SelectItem value="pending">In Prüfung</SelectItem>
              <SelectItem value="external">Extern frei</SelectItem>
              <SelectItem value="internal">Intern frei</SelectItem>
              <SelectItem value="anonymous">Anonym</SelectItem>
              <SelectItem value="restricted">Eingeschränkt</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={favoritesOnly ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 shrink-0"
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            <Star className={`mr-2 size-4 ${favoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            Nur Favoriten
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden h-9 shrink-0 lg:flex"
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
                  onSelect={(e) => {
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

          {/* Nur Admins: Erstellen-Button rechts */}
          {profile.role === 'admin' && (
            <Link href="/dashboard/new" className="shrink-0">
              <Button className="w-full sm:w-auto">
                <PlusCircleIcon className="mr-2 size-4" />
                Referenz erstellen
              </Button>
            </Link>
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
                      COLUMN_KEYS.filter((k) => visibleColumns[k]).length + 2
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
                      <TableCell className="max-w-[120px] truncate text-sm">
                        {ref.tags ?? '—'}
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
                    <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-transparent"
                        onClick={(e) => handleToggleFavorite(ref.id, e)}
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) =>
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
                            onSelect={(e) => {
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
                        onClick={(e) => handleToggleFavorite(selectedRef.id, e)}
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
                  {/* Freigabeprozess */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Freigabeprozess
                    </h3>
                    <div className="h-[120px] rounded-lg border bg-muted/10" />
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
                        <p className="text-foreground pl-4 text-xs font-medium">—</p>
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
                        <p className="text-foreground pl-4 text-xs font-medium">—</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <FileTextIcon className="size-3" /> Vertragsart
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">—</p>
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
                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <UserIcon className="size-3" /> Interner Kontakt
                      </span>
                      <p className="pl-4 text-xs font-medium">
                        {selectedRef.contact_display || selectedRef.contact_email || 'Nicht zugewiesen'}
                      </p>
                      <p className="text-muted-foreground pl-4 text-[10px]">Account Owner</p>
                    </div>
                  </section>

                  {/* Dateien */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Dateien
                    </h3>
                    {selectedRef.file_path ? (
                      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded bg-red-100 p-1.5 text-red-600 shrink-0">
                            <FileTextIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">Case Study PDF</p>
                            <p className="text-muted-foreground truncate text-[10px]">
                              {selectedRef.file_path.split('/').pop()}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs" asChild>
                          <a
                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${selectedRef.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLinkIcon className="mr-1 size-3" /> Öffnen
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground bg-muted/10 flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
                        <span>📎</span>
                        <p>Keine Dateien vorhanden.</p>
                      </div>
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
              <SheetFooter className="z-10 flex-col gap-2 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:justify-between">
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
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDelete(selectedRef.id, e)}
                      >
                        <Trash2Icon className="mr-2 size-4" /> Löschen
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/edit/${selectedRef.id}`)
                        }
                      >
                        <PencilIcon className="mr-2 size-4" /> Bearbeiten
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  {profile.role === 'sales' &&
                    (selectedRef.status === 'restricted' ||
                      selectedRef.status === 'internal') && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRequestSpecificApproval(selectedRef.id)
                        }
                      >
                        <Send className="mr-2 size-4" /> Einzelfreigabe anfragen
                      </Button>
                    )}
                  {profile.role === 'admin' &&
                    selectedRef.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmitForApproval(selectedRef.id)}
                      >
                        <Mail className="mr-2 size-4" /> Account Owner kontaktieren
                      </Button>
                    )}
                </div>
              </SheetFooter>
            </TooltipProvider>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
