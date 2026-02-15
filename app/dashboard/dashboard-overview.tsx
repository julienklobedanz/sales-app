'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<ReferenceRow['status'], string> = {
  draft: 'Entwurf',
  pending: 'Ausstehend',
  approved: 'Freigegeben',
}

const STATUS_BADGE_VARIANT: Record<
  ReferenceRow['status'],
  'secondary' | 'outline' | 'default'
> = {
  draft: 'secondary',
  pending: 'outline',
  approved: 'default',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function DashboardOverview({
  references: initialReferences,
  totalCount,
}: {
  references: ReferenceRow[]
  totalCount: number
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRef, setSelectedRef] = useState<ReferenceRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filteredReferences = useMemo(() => {
    let list = initialReferences
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
  }, [initialReferences, search, statusFilter])

  const openDetail = (ref: ReferenceRow) => {
    setSelectedRef(ref)
    setSheetOpen(true)
  }

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    // TODO: Implement Server Action for Delete
    toast.error('Löschen ist noch nicht implementiert.')
  }

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    toast.success('ID in die Zwischenablage kopiert')
  }

  const draftCount = initialReferences.filter((r) => r.status === 'draft').length
  const pendingCount = initialReferences.filter((r) => r.status === 'pending').length
  const approvedCount = initialReferences.filter((r) => r.status === 'approved').length

  return (
    <div className="flex flex-col space-y-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/new">
            <Button>
              <PlusCircleIcon className="mr-2 size-4" />
              Referenz erstellen
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <div className="text-muted-foreground">📊</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-muted-foreground text-xs">Referenzen in Datenbank</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
            <div className="text-muted-foreground">📝</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-muted-foreground text-xs">In Bearbeitung</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
            <div className="text-muted-foreground">⏳</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground text-xs">Warten auf Freigabe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freigegeben</CardTitle>
            <div className="text-muted-foreground">✅</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-muted-foreground text-xs">Verfügbar für Sales</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-[150px] pl-9 lg:w-[250px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="approved">Freigegeben</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Unternehmen</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Industrie</TableHead>
                <TableHead>Land</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Datum</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Keine Referenzen gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferences.map((ref) => (
                  <TableRow
                    key={ref.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(ref)}
                  >
                    <TableCell className="font-medium">{ref.company_name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {ref.title}
                    </TableCell>
                    <TableCell>{ref.industry ?? '—'}</TableCell>
                    <TableCell>{ref.country ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[ref.status]}>
                        {STATUS_LABELS[ref.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(ref.created_at)}
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
                          <DropdownMenuItem
                            onSelect={() => openDetail(ref)}
                          >
                            <FileTextIcon className="mr-2 h-4 w-4" />
                            Details ansehen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) =>
                              handleCopyId(ref.id, e as unknown as React.MouseEvent)
                            }
                          >
                            <CopyIcon className="mr-2 h-4 w-4" />
                            ID kopieren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => {
                              const ev = (e as unknown) as React.MouseEvent
                              handleDelete(ref.id, ev)
                            }}
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md md:max-w-[600px] md:w-[600px]">
          {selectedRef && (
            <>
              <SheetHeader className="z-10 border-b bg-background px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SheetTitle className="text-xl font-semibold leading-none tracking-tight">
                      {selectedRef.company_name}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground line-clamp-2 text-sm">
                      {selectedRef.title}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[selectedRef.status]}
                    className="shrink-0"
                  >
                    {STATUS_LABELS[selectedRef.status]}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="overview" className="w-full">
                  <div className="px-6 pt-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Übersicht</TabsTrigger>
                      <TabsTrigger value="files">Dateien</TabsTrigger>
                      <TabsTrigger value="history">Historie</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="mt-0 space-y-6 px-6 py-6">
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                        Zusammenfassung
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {selectedRef.summary ||
                          'Keine Zusammenfassung hinterlegt.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <Building2Icon className="size-3.5" /> Industrie
                        </span>
                        <p className="text-foreground pl-5.5 text-sm font-medium">
                          {selectedRef.industry || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <MapPinIcon className="size-3.5" /> Region
                        </span>
                        <p className="text-foreground pl-5.5 text-sm font-medium">
                          {selectedRef.country || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <GlobeIcon className="size-3.5" /> Website
                        </span>
                        <div className="pl-5.5">
                          {selectedRef.website ? (
                            <a
                              href={selectedRef.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 text-sm font-medium"
                            >
                              Öffnen <ExternalLinkIcon className="size-3" />
                            </a>
                          ) : (
                            <p className="text-foreground text-sm font-medium">—</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <CalendarIcon className="size-3.5" /> Erstellt
                        </span>
                        <p className="text-foreground pl-5.5 text-sm font-medium">
                          {formatDate(selectedRef.created_at)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <UserIcon className="text-muted-foreground size-4" />{' '}
                        Interner Kontakt
                      </h4>
                      <div className="pl-6">
                        <p className="text-sm font-medium">
                          {selectedRef.contact_person || 'Nicht zugewiesen'}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Account Owner
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="mt-0 px-6 py-6">
                    <div className="text-muted-foreground bg-muted/10 flex h-40 flex-col items-center justify-center rounded-lg border border-dashed text-sm">
                      <div className="bg-muted mb-2 rounded-full p-2">
                        <span className="flex h-4 w-4 items-center justify-center">📎</span>
                      </div>
                      <p>Keine Dateien vorhanden.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0 px-6 py-6">
                    <div className="relative ml-2 space-y-6 border-l pl-4">
                      <div className="relative">
                        <span className="bg-primary ring-background absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4" />
                        <p className="text-sm font-medium">Referenz erstellt</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDate(selectedRef.created_at)}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <SheetFooter className="z-10 gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => handleDelete(selectedRef.id, e)}
                >
                  <Trash2Icon className="mr-2 size-4" /> Löschen
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    /* TODO: Edit */
                  }}
                >
                  <PencilIcon className="mr-2 size-4" /> Bearbeiten
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
