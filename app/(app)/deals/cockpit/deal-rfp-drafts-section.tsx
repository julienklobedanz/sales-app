'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DealDeskDraftRow } from '@/lib/deal-desk/deal-analysis-types'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import {
  draftRowStatus,
  sortDraftRowsByCriticality,
} from '@/lib/deals/sort-draft-rows-by-criticality'
import { cn } from '@/lib/utils'

export function draftStatusLabel(status: 'ready' | 'draft' | 'gap'): string {
  if (status === 'ready') return COPY.deals.cockpit.draftsStatusReady
  if (status === 'draft') return COPY.deals.cockpit.draftsStatusDraft
  return COPY.deals.cockpit.draftsStatusGap
}

function referenceHoverLabel(row: DealDeskDraftRow): string | null {
  if (!row.reference) return null
  return row.reference.companyName
    ? `${row.reference.title} · ${row.reference.companyName}`
    : row.reference.title
}

function statusDotTitle(
  row: DealDeskDraftRow,
  status: 'ready' | 'draft' | 'gap',
): string | undefined {
  if (status === 'gap') return COPY.deals.cockpit.draftsNoReference
  return referenceHoverLabel(row) ?? undefined
}

export function DealRfpDraftsSection({ rows }: { rows: DealDeskDraftRow[] }) {
  const sortedRows = useMemo(() => sortDraftRowsByCriticality(rows), [rows])
  const { hrefFor, selected } = useCollectionObjectSelection({
    items: rows,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  const covered = rows.filter((d) => draftRowStatus(d) === 'ready').length
  const gaps = rows.filter((d) => draftRowStatus(d) === 'gap').length
  const coveredLabel = COPY.deals.cockpit.draftsCoveredCount
    .replace('{covered}', String(covered))
    .replace('{total}', String(rows.length))
  const gapsLabel =
    gaps > 0 ? COPY.deals.cockpit.draftsGapsCount.replace('{count}', String(gaps)) : null
  const sectionTitle =
    rows.length > 0
      ? `${COPY.deals.cockpit.draftsTitle} · ${rows.length}`
      : COPY.deals.cockpit.draftsTitle

  if (rows.length === 0) {
    return (
      <Card id="drafts" className="scroll-mt-24 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{sectionTitle}</CardTitle>
          <CardDescription>{COPY.deals.cockpit.draftsEmpty}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card id="drafts" className="scroll-mt-24 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{sectionTitle}</CardTitle>
        <CardDescription>
          {coveredLabel}
          {gapsLabel ? ` · ${gapsLabel}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative p-0">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-500/[0.06] via-amber-500/[0.04] to-emerald-500/[0.06]"
          aria-hidden
        />
        <ul className="relative divide-y divide-border/60">
          {sortedRows.map((row) => {
            const status = draftRowStatus(row)
            const current = selected?.id === row.id
            const dotTitle = statusDotTitle(row, status)

            return (
              <li key={row.id} className={cn(current && 'bg-muted/20')}>
                <Link
                  href={hrefFor(row.id)}
                  aria-current={current ? 'page' : undefined}
                  aria-label={COPY.deals.cockpit.draftsOpenDetail}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      status === 'ready' && 'bg-emerald-500',
                      status === 'draft' && 'bg-amber-500',
                      status === 'gap' && 'bg-red-500',
                    )}
                    title={dotTitle}
                    aria-label={dotTitle}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {row.requirement}
                      </p>
                      {status === 'ready' || status === 'gap' ? (
                        <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {draftStatusLabel(status)}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                          {draftStatusLabel(status)}
                        </span>
                      )}
                    </div>
                  </div>
                  <AppIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
