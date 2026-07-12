'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DealRow, DealStatus } from './types'
import { DealForm } from './new/deal-form'
import { importDealsFromXlsx } from './actions'
import { ArrowUpDown, CirclePlus, Loader, UploadIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { AppDataTable } from '@/components/ui/app-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { AppIcon } from '@/lib/icons'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import { getMatchStrength } from '@/lib/match/match-strength'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { COPY } from '@/lib/copy'
import { formatDealVolume } from '@/lib/format'
import { AccountCell } from '@/components/table/account-cell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, FolderOpen } from 'lucide-react'
import { TableBulkActionsBar } from '@/components/table/table-bulk-actions-bar'
import { CrmOnboardingEmptyState } from '@/app/dashboard/components/crm-onboarding-empty-state'
import { CrmImportPreviewDialog } from '@/app/dashboard/accounts/components/crm-import-preview-dialog'
import { useRole } from '@/hooks/useRole'
import { useCrmOAuthCallback } from '@/hooks/use-crm-oauth-callback'
import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'

type StatusFilterValue = 'all' | DealStatus
const DEAL_COLUMNS_STORAGE_KEY = 'refstack:deals:column-order-v2'
const DEAL_COL_LABELS = COPY.deals.columnViewLabels
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
  companies: { id: string; name: string }[]
  orgProfiles: { id: string; full_name: string | null }[]
  hubspotConfigured?: boolean
  hubspotConnected?: boolean
  canConnectCrm?: boolean
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
  companies,
  orgProfiles,
  hubspotConfigured = false,
  hubspotConnected = false,
  canConnectCrm = false,
}: Props) {
  const router = useRouter()
  const { isAdmin, isAccountManager } = useRole()
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [crmImportOpen, setCrmImportOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'select',
    'company_name',
    'title',
    'volume',
    'status',
    'reference_count',
    'match',
    'expiry_date',
    'account_manager_name',
    'sales_manager_name',
  ])

  const openCrmImport = useCallback(() => setCrmImportOpen(true), [])

  useCrmOAuthCallback({
    canConnectCrm,
    hubspotConnected,
    onOpenImport: openCrmImport,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DEAL_COLUMNS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const normalized = parsed.filter((id): id is string => typeof id === 'string')
      if (normalized.length > 0) setColumnOrder(normalized)
    } catch {
      // ignore invalid local storage payload
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DEAL_COLUMNS_STORAGE_KEY, JSON.stringify(columnOrder))
  }, [columnOrder])

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

  const filtersActive = statusFilter !== 'all'
  const showDealsOnboarding =
    deals.length === 0 && !query.trim() && !filtersActive

  const columns = useMemo<ColumnDef<DealRow>[]>(() => {
    return [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
              aria-label="Alle auswählen"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
              aria-label="Zeile auswählen"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 32,
        minSize: 32,
        maxSize: 32,
      },
      {
        accessorKey: 'status',
        meta: { viewLabel: DEAL_COL_LABELS.status },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
        cell: ({ row }) => <DealStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'title',
        meta: { viewLabel: DEAL_COL_LABELS.title },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Titel
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
        cell: ({ row }) => (
          <span className="block max-w-[360px] truncate font-medium">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: 'company_name',
        meta: { viewLabel: DEAL_COL_LABELS.company_name },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Account
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
        cell: ({ row }) => (
          <AccountCell
            companyName={row.original.company_name}
            companyLogoUrl={row.original.company_logo_url}
          />
        ),
      },
      {
        accessorKey: 'volume',
        meta: { viewLabel: DEAL_COL_LABELS.volume },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Volumen
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDealVolume(row.original.volume)}
          </span>
        ),
      },
      {
        id: 'reference_count',
        accessorFn: (row) => row.linked_refs?.length ?? 0,
        meta: { viewLabel: DEAL_COL_LABELS.reference_count },
        size: 96,
        minSize: 80,
        maxSize: 120,
        header: ({ column }) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-center px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {COPY.deals.referenceCountColumn}
              <span className="ml-2">
                <AppIcon icon={ArrowUpDown} size={16} />
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center tabular-nums text-muted-foreground">
            {row.original.linked_refs?.length ?? 0}
          </div>
        ),
      },
      {
        id: 'match',
        accessorFn: (row) => row.best_match_score,
        meta: { viewLabel: DEAL_COL_LABELS.match },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.best_match_score
          const b = rowB.original.best_match_score
          if (a == null && b == null) return 0
          if (a == null) return 1
          if (b == null) return -1
          return a - b
        },
        size: 80,
        minSize: 72,
        maxSize: 96,
        header: ({ column }) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-center px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {COPY.deals.matchColumn}
              <span className="ml-2">
                <AppIcon icon={ArrowUpDown} size={16} />
              </span>
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const refCount = row.original.linked_refs?.length ?? 0
          const score = row.original.best_match_score

          if (refCount === 0) {
            return (
              <div className="flex justify-center text-muted-foreground" aria-label="Keine Referenzen">
                —
              </div>
            )
          }

          if (score == null || Number.isNaN(score)) {
            return (
              <div className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="cursor-default text-muted-foreground"
                      aria-label="Manuell verknüpft, kein Match-Score"
                    >
                      —
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Manuell verknüpft — kein Match-Score aus Smart Match
                  </TooltipContent>
                </Tooltip>
              </div>
            )
          }

          const percent = Math.round(score * 100)
          const strength = getMatchStrength(score)

          return (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <MatchScoreCircle size="sm" strength={strength} percent={percent} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {strength.ariaLabel} · {percent}%
                </TooltipContent>
              </Tooltip>
            </div>
          )
        },
      },
      {
        accessorKey: 'account_manager_name',
        meta: { viewLabel: DEAL_COL_LABELS.account_manager_name },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {COPY.roles.accountManager}
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.account_manager_name ?? '—'}</span>,
      },
      {
        accessorKey: 'expiry_date',
        meta: { viewLabel: DEAL_COL_LABELS.expiry_date },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Ablauf
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
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
        meta: { viewLabel: DEAL_COL_LABELS.sales_manager_name },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {COPY.roles.salesManager}
            <span className="ml-2">
              <AppIcon icon={ArrowUpDown} size={16} />
            </span>
          </Button>
        ),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.sales_manager_name ?? '—'}</span>,
      },
    ]
  }, [])

  const createDealDialog = (
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
  )

  if (showDealsOnboarding) {
    return (
      <>
        <CrmOnboardingEmptyState
          variant="deals"
          onCreateManual={() => setCreateOpen(true)}
          canCreateManual={isAdmin || isAccountManager}
          hubspotConfigured={hubspotConfigured}
          hubspotConnected={hubspotConnected}
          canConnectCrm={canConnectCrm}
          onHubSpotClick={() => {
            if (hubspotConnected) {
              setCrmImportOpen(true)
            } else {
              window.location.href = getHubSpotConnectHref('deals')
            }
          }}
        />
        {createDealDialog}
        {canConnectCrm ? (
          <CrmImportPreviewDialog open={crmImportOpen} onOpenChange={setCrmImportOpen} />
        ) : null}
      </>
    )
  }

  return (
    <div className="space-y-3.5">
      <TableBulkActionsBar
        selectedCount={selectedDealIds.length}
        onClearSelection={() => setSelectedDealIds([])}
        actions={[
          {
            id: 'open',
            label: 'Öffnen',
            icon: FolderOpen,
            disabled: selectedDealIds.length !== 1,
            onClick: () => {
              const id = selectedDealIds[0]
              if (id) router.push(`/dashboard/deals/${id}`)
            },
          },
          {
            id: 'open-new-tab',
            label: 'Neuer Tab',
            icon: ExternalLink,
            disabled: selectedDealIds.length !== 1,
            onClick: () => {
              const id = selectedDealIds[0]
              if (id) window.open(`/dashboard/deals/${id}`, '_blank', 'noopener,noreferrer')
            },
          },
        ]}
      />
      <TooltipProvider delayDuration={300}>
      <AppDataTable
        tableVariant="deals"
        columns={columns}
        data={filtered}
        initialPageSize={30}
        getRowId={(row) => row.id}
        onSelectedRowIdsChange={setSelectedDealIds}
        initialColumnVisibility={{
          account_manager_name: false,
          sales_manager_name: false,
          status: true,
          company_name: true,
          title: true,
          volume: true,
          reference_count: true,
          match: true,
          expiry_date: true,
        }}
        initialColumnOrder={[
          'select',
          'company_name',
          'title',
          'volume',
          'status',
          'reference_count',
          'match',
          'expiry_date',
          'account_manager_name',
          'sales_manager_name',
        ]}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        enableColumnDrag
        toolbar={() => (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 sm:gap-3.5 overflow-x-hidden">
            <ToolbarSearchField
              variant="list"
              value={query}
              onChange={setQuery}
              placeholder={COPY.deals.searchPlaceholder}
              wrapperClassName="min-w-0 flex-1 basis-[min(100%,24rem)]"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
            >
              <SelectTrigger className="w-full sm:w-[200px] shrink-0" data-row-nav-ignore>
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
              variant="ghost"
              size="toolbar"
              disabled={importing}
              className="hover:bg-muted/70"
              onClick={() => xlsxInputRef.current?.click()}
            >
              {importing ? (
                <AppIcon icon={Loader} size={16} className="animate-spin" />
              ) : (
                <AppIcon icon={UploadIcon} size={16} />
              )}
              Listen importieren
            </Button>
            <Button
              type="button"
              size="toolbar"
              className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
              onClick={() => setCreateOpen(true)}
            >
              <AppIcon icon={CirclePlus} size={16} />
              {COPY.deals.newDealButton}
            </Button>
          </>
        )}
        showViewOptions
      />
      </TooltipProvider>
      {createDealDialog}
      {canConnectCrm ? (
        <CrmImportPreviewDialog open={crmImportOpen} onOpenChange={setCrmImportOpen} />
      ) : null}
    </div>
  )
}
