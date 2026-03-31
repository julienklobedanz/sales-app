'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DealRow } from './types'
import { DealForm } from './new/deal-form'
import { importDealsFromXlsx, type MatchSuggestion } from './actions'
import { HandshakeIcon, TimerIcon, PlusCircleIcon, Loader2, FileSpreadsheetIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'

type MatchMap = Record<string, { count: number; suggestions: MatchSuggestion[] }>

const REFERENCE_DAYS = 180

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

/** Volumen mit Tausender-Punkten (z. B. 1.500.000 oder 5 Mio). */
function formatVolume(vol: string | null): string {
  if (!vol || !vol.trim()) return '—'
  const normalized = vol.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  if (!Number.isNaN(num)) {
    if (num >= 1_000_000) return new Intl.NumberFormat('de-DE').format(Math.round(num / 1_000_000)) + ' Mio €'
    return new Intl.NumberFormat('de-DE').format(Math.round(num)) + ' €'
  }
  return vol
}

function LinkedRefLogos({ refs }: { refs: { id: string; logo_url?: string | null; title?: string }[] }) {
  const show = refs.slice(0, 3)
  const rest = refs.length - show.length
  return (
    <div className="flex items-center gap-0.5">
      {show.map((r) =>
        r.logo_url ? (
          <img
            key={r.id}
            src={r.logo_url}
            alt=""
            className="h-6 w-6 rounded object-contain border border-border bg-background"
            title={r.title}
          />
        ) : (
          <div
            key={r.id}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted text-[10px] text-muted-foreground"
            title={r.title}
          >
            —
          </div>
        )
      )}
      {rest > 0 && <span className="text-muted-foreground text-xs">+{rest}</span>}
    </div>
  )
}

function SmartMatchCell({
  dealId,
  matchMap,
  onOpenDeal,
}: { dealId: string; matchMap: MatchMap; onOpenDeal: (id: string) => void }) {
  const data = matchMap[dealId] ?? { count: 0, suggestions: [] }
  if (data.count === 0 && data.suggestions.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-primary hover:underline text-sm font-medium"
        >
          {data.count} passende Referenz{data.count !== 1 ? 'en' : ''}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-muted-foreground text-xs mb-2">Top-Vorschläge (Branche)</p>
        <ul className="space-y-1.5">
          {data.suggestions.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              {s.logo_url && (
                <img src={s.logo_url} alt="" className="h-6 w-6 rounded object-contain shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{s.title}</p>
                <p className="text-muted-foreground text-xs truncate">{s.company_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenDeal(dealId)}>Öffnen</Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  if (days <= 0) return <Badge variant="destructive">Abgelaufen</Badge>
  if (days <= 30) return <Badge variant="destructive">Läuft in {days} Tagen ab</Badge>
  if (days <= 90) return <Badge className="bg-yellow-500/90 text-white hover:bg-yellow-500/90">In {days} Tagen</Badge>
  return <Badge variant="secondary">Noch {days} Tage</Badge>
}

function ProgressBar({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  const total = REFERENCE_DAYS
  const remaining = Math.min(Math.max(days, 0), total)
  const percent = Math.round((remaining / total) * 100)
  const isRed = days <= 30
  const isYellow = days <= 90 && days > 30
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full transition-all ${
          isRed ? 'bg-destructive' : isYellow ? 'bg-yellow-500' : 'bg-primary'
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

type Props = {
  deals: DealRow[]
  expiring: DealRow[]
  matchMap: MatchMap
  currentUserId: string
  initialOpenDealId?: string | null
  companies: { id: string; name: string }[]
  orgProfiles: { id: string; full_name: string | null }[]
}

type TabKey = 'mine' | 'all' | 'expiring'

function isExpiringIn30Days(dateStr: string | null): boolean {
  if (!dateStr) return false
  const end = new Date(dateStr)
  if (Number.isNaN(end.getTime())) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return days <= 30
}

function DealStatusBadge({ status }: { status: DealRow['status'] }) {
  const s = status
  const label =
    s === 'open'
      ? 'OPEN'
      : s === 'rfp'
        ? 'RFP'
        : s === 'negotiation'
          ? 'NEGOTIATION'
          : s === 'won'
            ? 'WON'
            : s === 'lost'
              ? 'LOST'
              : s === 'withdrawn'
                ? 'ZURÜCKGEZOGEN'
                : 'ARCHIVED'
  const variant =
    s === 'won'
      ? 'secondary'
      : s === 'lost' || s === 'withdrawn'
        ? 'destructive'
        : 'outline'
  return <Badge variant={variant as any}>{label}</Badge>
}

export function DealsClientContent({
  deals,
  matchMap,
  currentUserId,
  companies,
  orgProfiles,
}: Props) {
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<TabKey>('mine')
  const [query, setQuery] = useState('')

  async function handleXlsxImport(file: File) {
    const formData = new FormData()
    formData.set('file', file)
    setImporting(true)
    try {
      const result = await importDealsFromXlsx(formData)
      if (result.success) {
        toast.success(result.created != null ? `${result.created} Deal(s) importiert.` : 'Import abgeschlossen.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Import fehlgeschlagen.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
    } finally {
      setImporting(false)
    }
  }

  const myDeals = useMemo(() => {
    return deals.filter((d) => d.account_manager_id === currentUserId || d.sales_manager_id === currentUserId)
  }, [deals, currentUserId])

  const expiring30 = useMemo(() => {
    return deals.filter((d) => isExpiringIn30Days(d.expiry_date))
  }, [deals])

  const baseList = tab === 'mine' ? myDeals : tab === 'expiring' ? expiring30 : deals

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baseList
    return baseList.filter((d) => {
      const hay = `${d.title} ${d.company_name ?? ''} ${d.account_manager_name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [baseList, query])

  const columns = useMemo<ColumnDef<DealRow>[]>(() => {
    return [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
            aria-label="Alle auswählen"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
            aria-label="Zeile auswählen"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <DealStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'title',
        header: 'Titel',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium hover:underline text-left"
            onClick={() => router.push(`/dashboard/deals/${row.original.id}`)}
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: 'company_name',
        header: 'Account',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.company_name ?? '—'}</span>,
      },
      {
        accessorKey: 'account_manager_name',
        header: 'Account Manager',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.account_manager_name ?? '—'}</span>,
      },
      {
        accessorKey: 'expiry_date',
        header: 'Ablauf',
        cell: ({ row }) => {
          const isHot = isExpiringIn30Days(row.original.expiry_date)
          return (
            <span className={isHot ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {row.original.expiry_date ? formatDate(row.original.expiry_date) : '—'}
            </span>
          )
        },
      },
      {
        id: 'matches',
        header: 'Matches',
        cell: ({ row }) => {
          const data = matchMap[row.original.id] ?? { count: 0, suggestions: [] }
          return (
            <div className="flex items-center gap-2">
              <span className={data.count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {data.count > 0 ? '✔' : '⚠'} {data.count}
              </span>
              {data.suggestions.length ? (
                <span className="text-muted-foreground text-xs truncate max-w-[180px]">
                  {data.suggestions.map((s) => s.title).slice(0, 2).join(' · ')}
                </span>
              ) : null}
            </div>
          )
        },
      },
    ]
  }, [matchMap])

  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tab === 'mine' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('mine')}
        >
          Meine Deals
        </Button>
        <Button
          variant={tab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('all')}
        >
          Alle Deals
        </Button>
        <Button
          variant={tab === 'expiring' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('expiring')}
        >
          Auslaufende Deals
        </Button>

        <div className="w-full sm:w-[280px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche (Titel, Account, AM) …"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          ref={xlsxInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleXlsxImport(file)
            e.target.value = ''
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-3"
          disabled={importing}
          onClick={() => xlsxInputRef.current?.click()}
        >
          {importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UploadIcon className="mr-2 size-4" />}
          Listen importieren
        </Button>
        <Button size="sm" className="h-9 px-3" onClick={() => setCreateOpen(true)}>
          <PlusCircleIcon className="mr-2 size-4" />
          Deal anlegen
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={filtered}
        initialPageSize={10}
        toolbar={toolbar}
        showViewOptions
      />
      {/* Popover/Dialog zum Anlegen eines neuen Deals */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] min-h-[60vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-[90vw] lg:max-w-7xl gap-0 border-0 px-6 py-6 md:px-12 md:py-10 lg:px-16 lg:py-12">
          <div className="flex flex-col items-center w-full max-w-full">
            <DialogHeader className="w-full max-w-4xl mx-auto px-0 pb-4">
              <DialogTitle>Deal anlegen</DialogTitle>
            </DialogHeader>
            <div className="w-full max-w-4xl">
              <DealForm companies={companies} orgProfiles={orgProfiles} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
