'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DealRow } from './types'
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
import { ROUTES } from '@/lib/routes'

type MatchMap = Record<string, { count: number; suggestions: MatchSuggestion[] }>

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
    const q = query.trim().toLowerCase()
    if (!q) return deals
    return deals.filter((d) => {
      const hay = `${d.title} ${d.company_name ?? ''} ${d.account_manager_name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [deals, query])

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
            onClick={() => router.push(ROUTES.deals.detail(row.original.id))}
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
        id: 'matches',
        header: COPY.misc.matches,
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
  }, [matchMap, router])

  return (
    <div className="space-y-4">
      <AppDataTable
        tableVariant="deals"
        columns={columns}
        data={filtered}
        initialPageSize={10}
        getRowId={(row) => row.id}
        toolbar={() => (
          <ToolbarSearchField
            variant="list"
            value={query}
            onChange={setQuery}
            placeholder={COPY.deals.searchPlaceholder}
          />
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
              Deal anlegen
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
