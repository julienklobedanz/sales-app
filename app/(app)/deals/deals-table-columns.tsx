'use client'

import type { ColumnDef } from '@tanstack/react-table'

import { DealStatusBadge } from '@/components/deal-status-badge'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import { TableAccountLinkContent } from '@/components/table/table-account-link-content'
import { TableRowAlign } from '@/components/table/table-row-align'
import { TableSortableHeader } from '@/components/table/table-sortable-header'
import { TableTitleHoverContent } from '@/components/table/table-title-hover-content'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { COPY } from '@/lib/copy'
import { dealProofDisplay } from '@/lib/deals/deal-proof-display'
import { compareResolvedDeadlines } from '@/lib/deals/resolve-deal-deadline'
import { formatDealVolume } from '@/lib/format'
import {
  isDealCollectionLotRow,
  type DealCollectionRow,
} from '@/lib/tenders/group-deals-for-collection'

import { DEAL_COL_LABELS } from './deals-table-constants'
import {
  formatResolvedCollectionDeadline,
  isDealExpiringIn30Days,
} from './deals-table-format'

export function buildDealsTableColumns(): ColumnDef<DealCollectionRow>[] {
  return [
    {
      accessorKey: 'collectionOrder',
      enableHiding: false,
      header: () => null,
      cell: () => null,
      size: 0,
      minSize: 0,
    },
    {
      id: 'status',
      accessorFn: (row) => (isDealCollectionLotRow(row) ? row.status : undefined),
      meta: { viewLabel: DEAL_COL_LABELS.status },
      size: 120,
      minSize: 88,
      header: ({ column }) => <TableSortableHeader label="Status" column={column} />,
      cell: ({ row }) =>
        isDealCollectionLotRow(row.original) ? (
          <DealStatusBadge status={row.original.status} />
        ) : null,
    },
    {
      id: 'title',
      accessorFn: (row) => row.title,
      meta: { viewLabel: DEAL_COL_LABELS.title },
      size: 280,
      minSize: 140,
      header: ({ column }) => <TableSortableHeader label="Titel" column={column} />,
      cell: ({ row }) =>
        isDealCollectionLotRow(row.original) ? (
          <TableRowAlign className="min-w-0">
            <TableTitleHoverContent
              title={row.original.title}
              href={row.original.href}
              previewLabel="Anforderungen"
              previewText={row.original.requirements_text}
              emptyPreviewText="Keine Anforderungen hinterlegt."
            />
          </TableRowAlign>
        ) : null,
    },
    {
      id: 'company_name',
      accessorFn: (row) =>
        isDealCollectionLotRow(row) ? row.company_name : row.companyName,
      meta: { viewLabel: DEAL_COL_LABELS.company_name },
      size: 220,
      minSize: 140,
      header: ({ column }) => <TableSortableHeader label="Account" column={column} />,
      cell: ({ row }) =>
        isDealCollectionLotRow(row.original) ? (
          <TableRowAlign>
            <TableAccountLinkContent
              companyId={row.original.company_id}
              companyName={row.original.company_name}
              companyLogoUrl={row.original.company_logo_url}
            />
          </TableRowAlign>
        ) : null,
    },
    {
      id: 'volume',
      accessorFn: (row) => (isDealCollectionLotRow(row) ? row.volume : undefined),
      meta: { viewLabel: DEAL_COL_LABELS.volume },
      size: 120,
      minSize: 88,
      header: ({ column }) => <TableSortableHeader label="Volumen" column={column} />,
      cell: ({ row }) =>
        isDealCollectionLotRow(row.original) ? (
          <span className="text-muted-foreground tabular-nums">
            {formatDealVolume(row.original.volume)}
          </span>
        ) : null,
    },
    {
      id: 'proof',
      accessorFn: (row) =>
        isDealCollectionLotRow(row) ? (row.linked_refs?.length ?? 0) : 0,
      meta: {
        viewLabel: DEAL_COL_LABELS.proof,
        headerAlign: 'center' as const,
      },
      size: 120,
      minSize: 88,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.deals.proofColumn} column={column} />
      ),
      cell: ({ row }) => {
        if (!isDealCollectionLotRow(row.original)) return null
        const display = dealProofDisplay(row.original)
        if (display.kind === 'empty') {
          return (
            <div
              className="flex justify-center text-muted-foreground"
              aria-label="Keine Referenzen"
            >
              —
            </div>
          )
        }
        if (display.kind === 'count_only') {
          return (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="cursor-default tabular-nums text-muted-foreground"
                    aria-label={`${display.count} Referenzen, manuell verknüpft`}
                  >
                    {display.count}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Manuell verknüpft — kein Match-Score aus Smart Match
                </TooltipContent>
              </Tooltip>
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span className="tabular-nums text-muted-foreground">{display.count}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="inline-flex cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MatchScoreCircle
                    size="sm"
                    strength={display.strength}
                    percent={display.percent}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {display.strength.ariaLabel} · {display.percent}%
              </TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
    {
      id: 'account_manager_name',
      accessorFn: (row) =>
        isDealCollectionLotRow(row) ? row.account_manager_name : undefined,
      meta: { viewLabel: DEAL_COL_LABELS.account_manager_name },
      size: 160,
      minSize: 100,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.roles.accountManager} column={column} />
      ),
      cell: ({ row }) =>
        isDealCollectionLotRow(row.original) ? (
          <span className="text-muted-foreground">
            {row.original.account_manager_name ?? '—'}
          </span>
        ) : null,
    },
    {
      id: 'expiry_date',
      accessorFn: (row) =>
        isDealCollectionLotRow(row) ? row.deadline.date : row.nextDeadline.date,
      meta: { viewLabel: DEAL_COL_LABELS.expiry_date },
      size: 120,
      minSize: 88,
      sortingFn: (rowA, rowB) =>
        compareResolvedDeadlines(
          isDealCollectionLotRow(rowA.original)
            ? rowA.original.deadline
            : rowA.original.nextDeadline,
          isDealCollectionLotRow(rowB.original)
            ? rowB.original.deadline
            : rowB.original.nextDeadline,
        ),
      header: ({ column }) => (
        <TableSortableHeader label={COPY.deals.deadlineColumn} column={column} />
      ),
      cell: ({ row }) => {
        if (!isDealCollectionLotRow(row.original)) return null
        const deadline = row.original.deadline
        const isHot = isDealExpiringIn30Days(deadline.date, row.original.status)
        return (
          <span
            className={isHot ? 'text-destructive font-medium' : 'text-muted-foreground'}
          >
            {formatResolvedCollectionDeadline(deadline) ?? '—'}
          </span>
        )
      },
    },
    {
      id: 'sales_manager_name',
      accessorFn: (row) =>
        isDealCollectionLotRow(row) ? row.sales_manager_name : undefined,
      meta: { viewLabel: DEAL_COL_LABELS.sales_manager_name },
      size: 160,
      minSize: 100,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.roles.salesManager} column={column} />
      ),
      cell: ({ row }) =>
        isDealCollectionLotRow(row.original) ? (
          <span className="text-muted-foreground">
            {row.original.sales_manager_name ?? '—'}
          </span>
        ) : null,
    },
  ]
}
