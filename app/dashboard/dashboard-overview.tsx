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
} from '@/components/ui/sheet'
import type { ReferenceRow } from './actions'
import { PlusCircleIcon, SlidersHorizontal } from 'lucide-react'

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
    <div className="flex flex-col space-y-6 pt-4">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-muted-foreground text-xs">Referenzen in Datenbank</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-muted-foreground text-xs">Noch nicht eingereicht</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground text-xs">Warten auf Freigabe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freigegeben</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="text-muted-foreground h-4 w-4"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
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
              placeholder="Referenzen filtern..."
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Unternehmen</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Industrie</TableHead>
                <TableHead>Land</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Erstellt am</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Keine Ergebnisse.
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
                    <TableCell className="max-w-[300px] truncate">{ref.title}</TableCell>
                    <TableCell className="text-muted-foreground">{ref.industry ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{ref.country ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[ref.status]}>
                        {STATUS_LABELS[ref.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
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
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedRef?.title}</SheetTitle>
            <SheetDescription>{selectedRef?.company_name}</SheetDescription>
          </SheetHeader>
          {selectedRef && (
            <div className="mt-6 space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">Zusammenfassung</h4>
                <p className="text-muted-foreground text-sm">
                  {selectedRef.summary || 'Keine Zusammenfassung vorhanden.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium">Industrie</h4>
                  <p className="text-sm">{selectedRef.industry ?? '—'}</p>
                </div>
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium">Land</h4>
                  <p className="text-sm">{selectedRef.country ?? '—'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium">Status</h4>
                <Badge variant={STATUS_BADGE_VARIANT[selectedRef.status]}>
                  {STATUS_LABELS[selectedRef.status]}
                </Badge>
              </div>
              <div>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium">Erstellt am</h4>
                <p className="text-sm">{formatDate(selectedRef.created_at)}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
