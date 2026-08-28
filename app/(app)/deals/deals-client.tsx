'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { SortingState } from '@tanstack/react-table'

import { CollectionPrimaryAction } from '@/components/dashboard/collection-primary-action'
import { CollectionToolbar } from '@/components/dashboard/collection-toolbar'
import { AppDataTable } from '@/components/ui/app-data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataTableViewOptions } from '@/components/ui/data-table-view-options'
import { useRole } from '@/hooks/useRole'
import { collectionToolbarSlotFill } from '@/lib/dashboard/collection-toolbar-slots'
import { COPY } from '@/lib/copy'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'
import {
  groupDealsForCollection,
  isDealCollectionLotRow,
} from '@/lib/tenders/group-deals-for-collection'

import { importDealsFromXlsx } from './actions'
import { DealCollectionBand } from './deal-collection-band'
import { DealsCreateDialog } from './deals-create-dialog'
import { DealsOnboardingEmptyState } from './deals-onboarding-empty-state'
import {
  DEALS_COLLECTION_DEFAULT_SORTING,
  isDealsCollectionGroupedSorting,
  resolveDealsCollectionSorting,
} from './deals-collection-sorting'
import { buildDealsTableColumns } from './deals-table-columns'
import {
  DEAL_DEFAULT_COLUMN_ORDER,
  DEAL_INITIAL_COLUMN_VISIBILITY,
  STATUS_FILTER_OPTIONS,
  type StatusFilterValue,
} from './deals-table-constants'
import { filterDealsTableRows } from './deals-table-format'
import type { DealRow } from './types'
import { useDealsTableColumnsState } from './use-deals-table-columns-state'

type Props = {
  deals: DealRow[]
  companies: { id: string; name: string }[]
  orgProfiles: { id: string; full_name: string | null }[]
}

export function DealsClientContent({ deals, companies, orgProfiles }: Props) {
  const router = useRouter()
  const { systemRole, functionRole } = useRole()
  const canImportDeals = !profileIsSalesRestricted(systemRole, functionRole)
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
  const [columnResetKey, setColumnResetKey] = useState(0)
  const {
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
    resetColumnsToDefault,
  } = useDealsTableColumnsState()
  const [sorting, setSorting] = useState<SortingState>(DEALS_COLLECTION_DEFAULT_SORTING)
  const groupedView = isDealsCollectionGroupedSorting(sorting)

  async function handleXlsxImport(file: File) {
    const formData = new FormData()
    formData.set('file', file)
    setImporting(true)
    try {
      const result = await importDealsFromXlsx(formData)
      if (result.success) {
        toast.success(
          result.created != null
            ? `${result.created} Deal(s) importiert.`
            : 'Import abgeschlossen.',
        )
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

  const grouped = useMemo(() => {
    const dealsFiltered = filterDealsTableRows({ deals, query, statusFilter })
    return groupDealsForCollection(dealsFiltered)
  }, [deals, query, statusFilter])

  const tableRows = useMemo(
    () => (groupedView ? grouped : grouped.filter(isDealCollectionLotRow)),
    [grouped, groupedView],
  )

  const filtersActive = statusFilter !== 'all'
  const showDealsOnboarding = deals.length === 0 && !query.trim() && !filtersActive

  const columns = useMemo(() => buildDealsTableColumns(), [])
  const slotFill = collectionToolbarSlotFill({
    collection: 'deals',
    canCreateReference: true,
  })

  const createDealDialog = (
    <DealsCreateDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      companies={companies}
      orgProfiles={orgProfiles}
    />
  )

  if (showDealsOnboarding) {
    return (
      <>
        <DealsOnboardingEmptyState
          onCreateManual={() => setCreateOpen(true)}
          canCreateManual
        />
        {createDealDialog}
      </>
    )
  }

  return (
    <div className="space-y-3.5">
      <input
        ref={xlsxInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleXlsxImport(file)
          e.target.value = ''
        }}
      />
      <TooltipProvider delayDuration={300}>
        <AppDataTable
          key={columnResetKey}
          tableVariant="deals"
          columns={columns}
          data={tableRows}
          initialPageSize={30}
          getRowId={(row) => row.id}
          getRowHref={(row) => row.href}
          renderFullWidthRow={(row) =>
            groupedView && row.rowKind === 'band' ? (
              <DealCollectionBand band={row} />
            ) : null
          }
          enableRowSelection={false}
          showViewOptions={false}
          sorting={sorting}
          onSortingChange={(next) => setSorting(resolveDealsCollectionSorting(next))}
          initialSorting={DEALS_COLLECTION_DEFAULT_SORTING}
          initialColumnVisibility={{
            ...DEAL_INITIAL_COLUMN_VISIBILITY,
            collectionOrder: false,
          }}
          initialColumnOrder={[...DEAL_DEFAULT_COLUMN_ORDER]}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          enableColumnDrag
          enableColumnResize
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          toolbar={(table) => (
            <CollectionToolbar
              slots={{
                'collection-search': (
                  <ToolbarSearchField
                    variant="dashboard"
                    value={query}
                    onChange={setQuery}
                    placeholder={COPY.deals.searchPlaceholder}
                    wrapperClassName="min-w-0 w-full"
                    className="bg-card"
                  />
                ),
                'collection-filter-primary': (
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
                  >
                    <SelectTrigger
                      className="w-full rounded-lg border bg-card shadow-sm data-[size=default]:h-10"
                      data-row-nav-ignore
                    >
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
                ),
                'collection-primary':
                  slotFill['collection-primary'] === 'empty' ? null : (
                    <CollectionPrimaryAction
                      label={COPY.deals.newDealButton}
                      onCreate={() => setCreateOpen(true)}
                      onImport={() => xlsxInputRef.current?.click()}
                      canImport={canImportDeals}
                      importing={importing}
                    />
                  ),
                'collection-columns': (
                  <DataTableViewOptions
                    table={table}
                    onReset={() => {
                      resetColumnsToDefault()
                      setColumnResetKey((key) => key + 1)
                    }}
                  />
                ),
              }}
            />
          )}
        />
      </TooltipProvider>
      {createDealDialog}
    </div>
  )
}
