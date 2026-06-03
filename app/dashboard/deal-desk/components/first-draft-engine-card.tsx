'use client'

import Image from 'next/image'
import { AlertCircle, ShieldCheck, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DealDeskDraftRow } from '@/lib/deal-desk/mock-analysis'

const COLUMN_LABEL_CLASS =
  'text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80'

const PAIR_GRID_CLASS = 'grid grid-cols-1 gap-8 md:grid-cols-2 md:items-stretch'

type Props = {
  draftRows: DealDeskDraftRow[]
  onRequestSme?: (row: DealDeskDraftRow) => void
  className?: string
}

function DraftProofBadge({ reference }: { reference: NonNullable<DealDeskDraftRow['reference']> }) {
  const initials = (reference.companyName ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 dark:bg-emerald-950/20">
      <ShieldCheck className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
      <div className="relative size-7 shrink-0 overflow-hidden rounded border bg-background p-0.5">
        {reference.logoUrl ? (
          <Image
            src={reference.logoUrl}
            alt=""
            fill
            sizes="28px"
            className="object-contain p-0.5"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">
            {initials}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{reference.title}</p>
        <p className="truncate text-[10px] text-muted-foreground">{reference.companyName}</p>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
        {reference.matchPercent}% Match
      </span>
    </div>
  )
}

function DraftGapAlert({
  row,
  onRequestSme,
  message = 'Keine verifizierte Referenz in der Datenbank vorhanden.',
}: {
  row: DealDeskDraftRow
  onRequestSme?: (row: DealDeskDraftRow) => void
  message?: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        <p className="text-sm font-medium leading-snug">{message}</p>
      </div>
      {onRequestSme ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-0 shrink-0 gap-1.5 border-destructive/30 bg-background text-destructive hover:bg-destructive/10 sm:ml-4"
          onClick={() => onRequestSme(row)}
        >
          <UserPlus className="size-3.5" aria-hidden />
          SME um Antwort bitten
        </Button>
      ) : null}
    </div>
  )
}

function DraftPairCard({
  row,
  onRequestSme,
}: {
  row: DealDeskDraftRow
  onRequestSme?: (row: DealDeskDraftRow) => void
}) {
  const hasAnswer = Boolean(row.answer?.trim())
  const hasReference = Boolean(row.reference)

  return (
    <article className="mb-4 rounded-xl border border-border bg-card p-6 shadow-sm last:mb-0">
      <div className={PAIR_GRID_CLASS}>
        <div className="flex min-h-[8rem] flex-col md:min-h-0">
          <p className="text-sm font-medium leading-relaxed text-foreground">{row.requirement}</p>
        </div>

        <div className="flex min-h-[8rem] flex-col md:min-h-0">
          {hasAnswer ? (
            <p className="text-sm leading-relaxed text-foreground">{row.answer}</p>
          ) : (
            <p className="text-sm italic leading-relaxed text-muted-foreground">
              Noch kein Antwortentwurf — Referenz oder SME-Klärung erforderlich.
            </p>
          )}
          <div className="mt-4 flex flex-1 flex-col justify-end">
            {hasReference && row.reference ? (
              <DraftProofBadge reference={row.reference} />
            ) : (
              <DraftGapAlert
                row={row}
                onRequestSme={onRequestSme}
                message={
                  hasAnswer
                    ? 'Keine verifizierte Referenz in der Datenbank vorhanden.'
                    : 'Keine verifizierte Referenz — Antwort kann nicht automatisch belegt werden.'
                }
              />
            )}
          </div>
        </div>
      </div>
    </article>
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
      <CardContent>
        {draftRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Anforderungen zum Abgleich.</p>
        ) : (
          <>
            <div className={`mb-4 ${PAIR_GRID_CLASS} border-b border-border/60 pb-3`}>
              <p className={COLUMN_LABEL_CLASS}>Kundenanforderung</p>
              <p className={COLUMN_LABEL_CLASS}>Unsere Antwort</p>
            </div>
            <div>
              {draftRows.map((row) => (
                <DraftPairCard key={row.id} row={row} onRequestSme={onRequestSme} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
