'use client'

import type { ColumnDef } from '@tanstack/react-table'

import { DealStatusBadge } from '@/components/deal-status-badge'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import { TableAccountLinkContent } from '@/components/table/table-account-link-content'
import { TableRowAlign } from '@/components/table/table-row-align'
import { TableSortableHeader } from '@/components/table/table-sortable-header'
import { TableTitleHoverContent } from '@/components/table/table-title-hover-content'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { COPY } from '@/lib/copy'
import { dealProofDisplay } from '@/lib/deals/deal-proof-display'
import { formatDealVolume } from '@/lib/format'
import { ROUTES } from '@/lib/routes'

import { DEAL_COL_LABELS } from './deals-table-constants'
import {
  formatDealCollectionDeadline,
  isDealExpiringIn30Days,
} from './deals-table-format'
import type { DealRow } from './types'

export function buildDealsTableColumns(): ColumnDef<DealRow>[] {
  return [
    {
      accessorKey: 'status',
      meta: { viewLabel: DEAL_COL_LABELS.status },
      size: 120,
      minSize: 88,
      header: ({ column }) => <TableSortableHeader label="Status" column={column} />,
      cell: ({ row }) => <DealStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'title',
      meta: { viewLabel: DEAL_COL_LABELS.title },
      size: 280,
      minSize: 140,
      header: ({ column }) => <TableSortableHeader label="Titel" column={column} />,
      cell: ({ row }) => (
        <TableRowAlign className="min-w-0">
          <TableTitleHoverContent
            title={row.original.title}
            href={ROUTES.deals.detail(row.original.id)}
            previewLabel="Anforderungen"
            previewText={row.original.requirements_text}
            emptyPreviewText="Keine Anforderungen hinterlegt."
          />
        </TableRowAlign>
      ),
    },
    {
      accessorKey: 'company_name',
      meta: { viewLabel: DEAL_COL_LABELS.company_name },
      size: 220,
      minSize: 140,
      header: ({ column }) => <TableSortableHeader label="Account" column={column} />,
      cell: ({ row }) => (
        <TableRowAlign>
          <TableAccountLinkContent
            companyId={row.original.company_id}
            companyName={row.original.company_name}
            companyLogoUrl={row.original.company_logo_url}
          />
        </TableRowAlign>
      ),
    },
    {
      accessorKey: 'volume',
      meta: { viewLabel: DEAL_COL_LABELS.volume },
      size: 120,
      minSize: 88,
      header: ({ column }) => <TableSortableHeader label="Volumen" column={column} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDealVolume(row.original.volume)}
        </span>
      ),
    },
    {
      id: 'proof',
      accessorFn: (row) => row.linked_refs?.length ?? 0,
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
      accessorKey: 'account_manager_name',
      meta: { viewLabel: DEAL_COL_LABELS.account_manager_name },
      size: 160,
      minSize: 100,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.roles.accountManager} column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.account_manager_name ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'expiry_date',
      meta: { viewLabel: DEAL_COL_LABELS.expiry_date },
      size: 120,
      minSize: 88,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.expiry_date
        const b = rowB.original.expiry_date
        if (!a && !b) return 0
        if (!a) return 1
        if (!b) return -1
        return new Date(a).getTime() - new Date(b).getTime()
      },
      header: ({ column }) => (
        <TableSortableHeader label={COPY.deals.deadlineColumn} column={column} />
      ),
      cell: ({ row }) => {
        const isHot = isDealExpiringIn30Days(
          row.original.expiry_date,
          row.original.status,
        )
        return (
          <span
            className={isHot ? 'text-destructive font-medium' : 'text-muted-foreground'}
          >
            {row.original.expiry_date
              ? formatDealCollectionDeadline(row.original.expiry_date)
              : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'sales_manager_name',
      meta: { viewLabel: DEAL_COL_LABELS.sales_manager_name },
      size: 160,
      minSize: 100,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.roles.salesManager} column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.sales_manager_name ?? '—'}
        </span>
      ),
    },
  ]
}
