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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'

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

  const draftCount = initialReferences.filter((r) => r.status === 'draft').length
  const pendingCount = initialReferences.filter((r) => r.status === 'pending').length
  const approvedCount = initialReferences.filter((r) => r.status === 'approved').length

  return (
    <div className="flex flex-col space-y-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
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
            <div className="text-muted-foreground h-4 w-4">📊</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-muted-foreground text-xs">Referenzen in Datenbank</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
            <div className="text-muted-foreground h-4 w-4">📝</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-muted-foreground text-xs">In Bearbeitung</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
            <div className="text-muted-foreground h-4 w-4">⏳</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground text-xs">Warten auf Freigabe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freigegeben</CardTitle>
            <div className="text-muted-foreground h-4 w-4">✅</div>
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
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px]">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Keine Referenzen gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferences.map((ref) => (
                  <TableRow
                    key={ref.id}
                    className="cursor-pointer hover:bg-muted/50"
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="overflow-y-auto sm:max-w-[600px]"
        >
          {selectedRef && (
            <>
              <SheetHeader className="mb-6 space-y-2">
                <div className="flex items-start justify-between">
                  <SheetTitle className="text-xl font-semibold leading-none tracking-tight">
                    {selectedRef.company_name}
                  </SheetTitle>
                  <Badge variant={STATUS_BADGE_VARIANT[selectedRef.status]}>
                    {STATUS_LABELS[selectedRef.status]}
                  </Badge>
                </div>
                <SheetDescription className="text-muted-foreground text-base">
                  {selectedRef.title}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Übersicht</TabsTrigger>
                  <TabsTrigger value="files">Dateien</TabsTrigger>
                  <TabsTrigger value="history">Historie</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="animate-in fade-in-50 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-foreground/80 text-sm font-medium leading-none">
                      Zusammenfassung
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {selectedRef.summary || 'Keine Zusammenfassung hinterlegt.'}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                    <div className="space-y-1.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <Building2Icon className="size-3.5" /> Industrie
                      </span>
                      <p className="text-foreground text-sm font-medium">
                        {selectedRef.industry || '—'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <MapPinIcon className="size-3.5" /> Region / Land
                      </span>
                      <p className="text-foreground text-sm font-medium">
                        {selectedRef.country || '—'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <GlobeIcon className="size-3.5" /> Website
                      </span>
                      {selectedRef.website ? (
                        <a
                          href={selectedRef.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
                        >
                          Öffnen <ExternalLinkIcon className="size-3" />
                        </a>
                      ) : (
                        <p className="text-foreground text-sm font-medium">—</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <span className="size-3.5">📅</span> Erstellt am
                      </span>
                      <p className="text-foreground text-sm font-medium">
                        {formatDate(selectedRef.created_at)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/40 rounded-md border p-4">
                    <h4 className="mb-1 text-sm font-semibold">Interner Kontakt</h4>
                    <p className="text-muted-foreground text-sm">
                      {selectedRef.contact_person ||
                        'Kein Ansprechpartner hinterlegt.'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="files" className="animate-in fade-in-50 mt-4">
                  <div className="text-muted-foreground bg-muted/20 flex h-40 flex-col items-center justify-center rounded-md border border-dashed text-sm">
                    <div className="bg-muted mb-2 rounded-full p-2">
                      <span className="flex h-4 w-4 items-center justify-center">📎</span>
                    </div>
                    <p>Keine Dateien vorhanden.</p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="animate-in fade-in-50 mt-4">
                  <div className="space-y-4">
                    <div className="flex gap-4 text-sm">
                      <div className="text-muted-foreground w-24 flex-none">
                        {formatDate(selectedRef.created_at)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Referenz erstellt</p>
                        <p className="text-muted-foreground text-xs">
                          Initiale Anlage des Datensatzes.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <SheetFooter className="mt-8 flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto"
                >
                  <Trash2Icon className="mr-2 size-4" /> Löschen
                </Button>
                <Button
                  className="w-full sm:w-auto"
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
