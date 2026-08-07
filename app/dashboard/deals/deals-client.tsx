'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, Loader, UploadIcon } from '@hugeicons/core-free-icons'
import { ExternalLink, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

import { CrmImportPreviewDialog } from '@/app/dashboard/accounts/components/crm-import-preview-dialog'
import { AccountsToolbarTooltip } from '@/app/dashboard/accounts/components/accounts-toolbar-tooltip'
import { CrmOnboardingEmptyState } from '@/app/dashboard/components/crm-onboarding-empty-state'
import { TableBulkActionsBar } from '@/components/table/table-bulk-actions-bar'
import { AppDataTable } from '@/components/ui/app-data-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import { useCrmOAuthCallback } from '@/hooks/use-crm-oauth-callback'
import { useRole } from '@/hooks/useRole'
import { COPY } from '@/lib/copy'
import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'
import { AppIcon } from '@/lib/icons'

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
  const { isAdmin, isAccountManager } = useRole()
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [crmImportOpen, setCrmImportOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([])
  const { columnOrder, setColumnOrder, columnSizing, setColumnSizing } =
    useDealsTableColumnsState()

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
              if (id)
                window.open(`/dashboard/deals/${id}`, '_blank', 'noopener,noreferrer')
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
          initialColumnVisibility={{ ...DEAL_INITIAL_COLUMN_VISIBILITY }}
          initialColumnOrder={[...DEAL_DEFAULT_COLUMN_ORDER]}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          enableColumnDrag
          enableColumnResize
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          toolbar={() => (
            <div className="flex min-h-10 w-full min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
              <ToolbarSearchField
                variant="dashboard"
                value={query}
                onChange={setQuery}
                placeholder={COPY.deals.searchPlaceholder}
                wrapperClassName="min-w-0 flex-1 basis-[min(100%,24rem)]"
                className="bg-white"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
              >
                <SelectTrigger
                  className="w-full shrink-0 rounded-lg border bg-white shadow-sm data-[size=default]:h-10 sm:w-[200px]"
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
              <AccountsToolbarTooltip label="Listen importieren">
                <Button
                  type="button"
                  variant="ghost"
                  size="toolbar"
                  disabled={importing}
                  className="shrink-0 px-2.5 hover:bg-muted/70"
                  onClick={() => xlsxInputRef.current?.click()}
                  aria-label="Listen importieren"
                >
                  {importing ? (
                    <AppIcon
                      icon={Loader}
                      size={16}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : (
                    <AppIcon
                      icon={UploadIcon}
                      size={16}
                      className="shrink-0 text-muted-foreground"
                    />
                  )}
                </Button>
              </AccountsToolbarTooltip>
              <Button type="button" size="toolbar" onClick={() => setCreateOpen(true)}>
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
