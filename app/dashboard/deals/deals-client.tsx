'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { CrmImportPreviewDialog } from '@/app/dashboard/accounts/components/crm-import-preview-dialog'
import { CrmOnboardingEmptyState } from '@/app/dashboard/components/crm-onboarding-empty-state'
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
import { useCrmOAuthCallback } from '@/hooks/use-crm-oauth-callback'
import { useRole } from '@/hooks/useRole'
import { collectionToolbarSlotFill } from '@/lib/dashboard/collection-toolbar-slots'
import { COPY } from '@/lib/copy'
import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'

import { importDealsFromXlsx } from './actions'
import { DealsCreateDialog } from './deals-create-dialog'
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
  hubspotConfigured?: boolean
  hubspotConnected?: boolean
  canConnectCrm?: boolean
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
  const { systemRole, functionRole } = useRole()
  const canImportDeals = !profileIsSalesRestricted(systemRole, functionRole)
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [crmImportOpen, setCrmImportOpen] = useState(false)
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

  const openCrmImport = useCallback(() => setCrmImportOpen(true), [])

  useCrmOAuthCallback({
    canConnectCrm,
    hubspotConnected,
    onOpenImport: openCrmImport,
  })

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

  const filtered = useMemo(
    () => filterDealsTableRows({ deals, query, statusFilter }),
    [deals, query, statusFilter],
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
        <CrmOnboardingEmptyState
          variant="deals"
          onCreateManual={() => setCreateOpen(true)}
          canCreateManual
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
          data={filtered}
          initialPageSize={30}
          getRowId={(row) => row.id}
          enableRowSelection={false}
          showViewOptions={false}
          initialSorting={[{ id: 'expiry_date', desc: false }]}
          initialColumnVisibility={{ ...DEAL_INITIAL_COLUMN_VISIBILITY }}
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
                    className="bg-white"
                  />
                ),
                'collection-filter-primary': (
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
                  >
                    <SelectTrigger
                      className="w-full rounded-lg border bg-white shadow-sm data-[size=default]:h-10"
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
      {canConnectCrm ? (
        <CrmImportPreviewDialog open={crmImportOpen} onOpenChange={setCrmImportOpen} />
      ) : null}
    </div>
  )
}
