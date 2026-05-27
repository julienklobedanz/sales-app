'use client'

import Image from 'next/image'
import { AlertCircle, Plus, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DealDeskDraftRow } from '@/lib/deal-desk/mock-analysis'
import { cn } from '@/lib/utils'

const TABLE_HEAD_CLASS =
  'h-10 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400'

const ROW_CLASS =
  'border-0 transition-all duration-200 hover:bg-slate-50/60 [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl'

type Props = {
  draftRows: DealDeskDraftRow[]
  onRequestSme?: (row: DealDeskDraftRow) => void
  className?: string
}

function DraftProofBadge({ reference }: { reference: NonNullable<DealDeskDraftRow['reference']> }) {
  const initials = (reference.companyName ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 transition-colors hover:border-emerald-200">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-slate-900">{reference.title}</p>
          <div className="flex items-center gap-2">
            <div className="relative size-8 shrink-0 overflow-hidden rounded border bg-white p-1">
              {reference.logoUrl ? (
                <Image
                  src={reference.logoUrl}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-contain p-0.5"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-[10px] font-bold text-slate-600">
                  {initials}
                </span>
              )}
            </div>
            <span className="truncate text-[10px] text-slate-500">{reference.companyName}</span>
          </div>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
        {reference.matchPercent}% Match
      </span>
    </div>
  )
}

function DraftGapCard({
  row,
  onRequestSme,
}: {
  row: DealDeskDraftRow
  onRequestSme?: (row: DealDeskDraftRow) => void
}) {
  return (
    <div className="mt-2 flex flex-col items-start justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-2">
        <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />
        <p className="text-xs font-medium text-amber-800">
          Keine verifizierte Referenz in der Datenbank vorhanden.
        </p>
      </div>
      {onRequestSme ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 border-amber-200 bg-white text-xs text-amber-700 hover:bg-amber-100"
          onClick={() => onRequestSme(row)}
        >
          <Plus className="size-3.5" aria-hidden />
          SME um Antwort bitten
        </Button>
      ) : null}
    </div>
  )
}

export function FirstDraftEngineCard({ draftRows, onRequestSme, className }: Props) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">First Draft Engine</CardTitle>
        <CardDescription>
          Kundenanforderung und Entwurf im Überblick — nur mit verifizierter Referenz (keine
          Halluzination). Eignungsmatrizen werden spaltenweise aus Referenzen befüllt, wo ein Match
          vorliegt.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <Table className="border-separate border-spacing-y-1">
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[42%]')}>Kundenanforderung</TableHead>
              <TableHead className={TABLE_HEAD_CLASS}>Unsere Antwort</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draftRows.map((row) => {
              const hasAnswer = Boolean(row.answer?.trim())
              const hasReference = Boolean(row.reference)

              return (
                <TableRow key={row.id} className={ROW_CLASS}>
                  <TableCell className="whitespace-normal px-4 py-4 align-top">
                    <p className="text-sm font-medium leading-relaxed text-slate-900">
                      {row.requirement}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-normal px-4 py-4 align-top">
                    {hasAnswer ? (
                      <>
                        <p className="text-sm leading-relaxed text-slate-600">{row.answer}</p>
                        {hasReference && row.reference ? (
                          <DraftProofBadge reference={row.reference} />
                        ) : (
                          <DraftGapCard row={row} onRequestSme={onRequestSme} />
                        )}
                      </>
                    ) : (
                      <DraftGapCard row={row} onRequestSme={onRequestSme} />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
