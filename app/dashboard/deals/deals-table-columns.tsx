'use client'

import type { ColumnDef } from '@tanstack/react-table'

import { DealStatusBadge } from '@/components/deal-status-badge'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import { TableAccountLinkContent } from '@/components/table/table-account-link-content'
import { TableRowAlign } from '@/components/table/table-row-align'
import { TableRowCheckbox } from '@/components/table/table-row-checkbox'
import { TableSortableHeader } from '@/components/table/table-sortable-header'
import { TableTitleHoverContent } from '@/components/table/table-title-hover-content'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { COPY } from '@/lib/copy'
import { formatDealVolume } from '@/lib/format'
import { getMatchStrength } from '@/lib/match/match-strength'
import { ROUTES } from '@/lib/routes'

import { DEAL_COL_LABELS } from './deals-table-constants'
import {
  formatDealTableDate,
  isDealExpiringIn30Days,
} from './deals-table-format'
import type { DealRow } from './types'

export function buildDealsTableColumns(): ColumnDef<DealRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <TableRowCheckbox
          rowHeight={10}
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
          aria-label="Alle auswählen"
        />
      ),
      cell: ({ row }) => (
        <TableRowCheckbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Zeile auswählen"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 32,
      minSize: 32,
      maxSize: 32,
    },
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
      id: 'reference_count',
      accessorFn: (row) => row.linked_refs?.length ?? 0,
      meta: {
        viewLabel: DEAL_COL_LABELS.reference_count,
        headerAlign: 'center' as const,
      },
      size: 96,
      minSize: 80,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.deals.referenceCountColumn} column={column} />
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
      meta: { viewLabel: DEAL_COL_LABELS.match, headerAlign: 'center' as const },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.best_match_score
        const b = rowB.original.best_match_score
        if (a == null && b == null) return 0
        if (a == null) return 1
        if (b == null) return -1
        return a - b
      },
      size: 88,
      minSize: 72,
      header: ({ column }) => (
        <TableSortableHeader label={COPY.deals.matchColumn} column={column} />
      ),
      cell: ({ row }) => {
        const refCount = row.original.linked_refs?.length ?? 0
        const score = row.original.best_match_score

        if (refCount === 0) {
          return (
            <div
              className="flex justify-center text-muted-foreground"
              aria-label="Keine Referenzen"
            >
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
                <span
                  tabIndex={0}
                  className="inline-flex cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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
      header: ({ column }) => <TableSortableHeader label="Deadline" column={column} />,
      cell: ({ row }) => {
        const isHot = isDealExpiringIn30Days(row.original.expiry_date)
        return (
          <span
            className={isHot ? 'text-destructive font-medium' : 'text-muted-foreground'}
          >
            {row.original.expiry_date ? formatDealTableDate(row.original.expiry_date) : '—'}
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
