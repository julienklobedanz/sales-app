'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DealRow, DealStatus } from './types'
import { DealForm } from './new/deal-form'
import { importDealsFromXlsx, type MatchSuggestion } from './actions'
import { CirclePlus, Loader, UploadIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { AppDataTable } from '@/components/ui/app-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { AppIcon } from '@/lib/icons'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { COPY } from '@/lib/copy'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type MatchMap = Record<string, { count: number; suggestions: MatchSuggestion[] }>

type StatusFilterValue = 'all' | DealStatus
const STATUS_FILTER_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: COPY.deals.filterStatusAll },
  { value: 'negotiation', label: COPY.deals.filterStatusNegotiation },
  { value: 'rfp', label: COPY.deals.filterStatusRfp },
  { value: 'won', label: COPY.deals.filterStatusWon },
  { value: 'lost', label: COPY.deals.filterStatusLost },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

type Props = {
  deals: DealRow[]
  matchMap: MatchMap
  companies: { id: string; name: string }[]
  orgProfiles: { id: string; full_name: string | null }[]
}

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

export function DealsClientContent({
  deals,
  matchMap,
  companies,
  orgProfiles,
}: Props) {
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')

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

  const filtered = useMemo(() => {
    let list = deals
    if (statusFilter !== 'all') {
      list = list.filter((d) => d.status === statusFilter)
    }
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((d) => {
      const hay = `${d.title} ${d.company_name ?? ''} ${d.account_manager_name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [deals, query, statusFilter])

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
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'company_name',
        header: 'Account',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.company_name ?? '—'}</span>,
      },
      {
        accessorKey: 'volume',
        header: 'Volumen',
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">{row.original.volume?.trim() || '—'}</span>
        ),
      },
      {
        id: 'reference_count',
        accessorFn: (row) => row.linked_refs?.length ?? 0,
        header: COPY.deals.referenceCountColumn,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.linked_refs?.length ?? 0}
          </span>
        ),
      },
      {
        accessorKey: 'account_manager_name',
        header: COPY.roles.accountManager,
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
        accessorKey: 'sales_manager_name',
        header: COPY.roles.salesManager,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.sales_manager_name ?? '—'}</span>,
      },
    ]
  }, [])

  return (
    <div className="space-y-4">
      <AppDataTable
        tableVariant="deals"
        columns={columns}
        data={filtered}
        initialPageSize={10}
        getRowId={(row) => row.id}
        toolbar={() => (
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <ToolbarSearchField
              variant="list"
              value={query}
              onChange={setQuery}
              placeholder={COPY.deals.searchPlaceholder}
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
            >
              <SelectTrigger className="w-full sm:w-[200px]" data-row-nav-ignore>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        toolbarRight={() => (
          <>
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
              type="button"
              variant="outline"
              size="toolbar"
              disabled={importing}
              onClick={() => xlsxInputRef.current?.click()}
            >
              {importing ? (
                <AppIcon icon={Loader} size={16} className="animate-spin" />
              ) : (
                <AppIcon icon={UploadIcon} size={16} />
              )}
              Listen importieren
            </Button>
            <Button type="button" size="toolbar" onClick={() => setCreateOpen(true)}>
              <AppIcon icon={CirclePlus} size={16} />
              {COPY.deals.newDealButton}
            </Button>
          </>
        )}
        showViewOptions
      />
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
