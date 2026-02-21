'use client'

import { useMemo, useState } from 'react'
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
  UserIcon,
  MoreHorizontal,
  CopyIcon,
  FileTextIcon,
  SearchIcon,
  BarChart3,
  FileEdit,
  Clock,
  CheckCircle,
  Send,
  Mail,
  Star,
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

/** Deterministisches Datumsformat (Server = Client), vermeidet Hydration-Fehler durch toLocaleDateString. */
function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

// --- Hauptkomponente ---

export function DashboardOverview({
  references: initialReferences,
  totalCount,
  profile,
  title = 'Dashboard',
  initialFavoritesOnly = false,
}: {
  references: ReferenceRow[]
  totalCount: number
  profile: Profile
  title?: string
  initialFavoritesOnly?: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly)
  const [selectedRef, setSelectedRef] = useState<ReferenceRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    industry: true,
    country: true,
    status: true,
    date: true,
  })

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

  // Quick Stats berechnen
  const draftCount = initialReferences.filter((r) => r.status === 'draft').length
  const pendingCount = initialReferences.filter((r) => r.status === 'pending').length
  const approvedCount = initialReferences.filter((r) =>
    ['external', 'internal', 'anonymous', 'restricted'].includes(r.status)
  ).length

  return (
    <div className="flex flex-col space-y-8 pt-6">
      {/* 1. Header Bereich (Nur Titel) */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <BarChart3 className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Referenzen in Datenbank</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
            <FileEdit className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">In Bearbeitung</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
            <Clock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Warten auf Freigabe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freigegeben</CardTitle>
            <CheckCircle className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Verfügbar für Sales</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Toolbar & Tabelle */}
      <div className="space-y-4">
        {/* Toolbar: Suche (breit), Filter, Button (rechts) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Linke Seite: Suche (Breiter) & Filter */}
          <div className="flex flex-1 items-center gap-2">
            <div className="relative max-w-lg flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Referenzen suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[180px] shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5" />
                  <SelectValue placeholder="Alle Status" />
                </div>
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

            {/* Spalten ein/ausblenden */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto hidden h-9 lg:flex">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Spalten
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Sichtbarkeit</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(visibleColumns).map((column) => (
                  <DropdownMenuItem
                    key={column}
                    onSelect={(e) => {
                      e.preventDefault()
                      setVisibleColumns((prev) => ({
                        ...prev,
                        [column]: !prev[column as keyof typeof visibleColumns],
                      }))
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 border rounded-sm flex items-center justify-center ${
                          visibleColumns[column as keyof typeof visibleColumns]
                            ? 'bg-primary border-primary'
                            : ''
                        }`}
                      >
                        {visibleColumns[column as keyof typeof visibleColumns] && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="capitalize">
                        {column === 'date' ? 'Datum' : column === 'industry' ? 'Industrie' : column === 'country' ? 'Land' : column === 'status' ? 'Status' : column}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nur Admins sehen den "Erstellen"-Button; Sales sieht hier nichts */}
          {profile.role === 'admin' && (
            <Link href="/dashboard/new">
              <Button className="w-full sm:w-auto">
                <PlusCircleIcon className="mr-2 size-4" />
                Referenz erstellen
              </Button>
            </Link>
          )}
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Unternehmen</TableHead>
                <TableHead>Titel</TableHead>
                {visibleColumns.industry && <TableHead>Industrie</TableHead>}
                {visibleColumns.country && <TableHead>Land</TableHead>}
                {visibleColumns.status && <TableHead>Status</TableHead>}
                {visibleColumns.date && <TableHead className="text-right">Datum</TableHead>}
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      2 +
                      (visibleColumns.industry ? 1 : 0) +
                      (visibleColumns.country ? 1 : 0) +
                      (visibleColumns.status ? 1 : 0) +
                      (visibleColumns.date ? 1 : 0) +
                      2
                    }
                    className="h-24 text-center text-muted-foreground"
                  >
                    Keine Referenzen gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferences.map((ref) => (
                  <TableRow
                    key={ref.id}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => openDetail(ref)}
                  >
                    <TableCell className="font-medium">{ref.company_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {ref.title}
                    </TableCell>
                    {visibleColumns.industry && <TableCell>{ref.industry ?? '—'}</TableCell>}
                    {visibleColumns.country && <TableCell>{ref.country ?? '—'}</TableCell>}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[ref.status] ?? 'outline'}>
                          {STATUS_LABELS[ref.status] ?? ref.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.date && (
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDate(ref.created_at)}
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
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-sm md:w-[380px] md:max-w-[380px]">
          {selectedRef && (
            <>
              {/* Fixierter Header */}
              <SheetHeader className="z-10 border-b bg-background px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-lg font-semibold leading-tight tracking-tight truncate">
                        {selectedRef.company_name}
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
                      {selectedRef.title}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[selectedRef.status] ?? 'outline'}
                    className="shrink-0 text-xs"
                  >
                    {STATUS_LABELS[selectedRef.status] ?? selectedRef.status}
                  </Badge>
                </div>
              </SheetHeader>

              {/* Ein scrollbarer Bereich: Übersicht, Dateien, Historie untereinander */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Abstand zwischen Abschnitten: space-y-8 | Abstand innerhalb Abschnitt: space-y-4 | Mehr Abstand oben vor Übersicht: pt-6 */}
                <div className="space-y-8 pt-6">
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
                          <MapPinIcon className="size-3" /> Region
                        </span>
                        <p className="text-foreground pl-4 text-xs font-medium">
                          {selectedRef.country || '—'}
                        </p>
                      </div>
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
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
