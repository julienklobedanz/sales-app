'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KiEntwurfSheet } from '@/app/dashboard/deals/components/ki-entwurf-sheet'
import type { DealWithReferences } from '@/app/dashboard/deals/types'
import { COPY } from '@/lib/copy'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import type { DealDeskDraftRow } from '@/lib/deal-desk/mock-analysis'
import { buildDealContextForKiEntwurf } from '@/lib/deals/build-deal-context-for-ki-entwurf'

type ActiveDraft = {
  row: DealDeskDraftRow
  referenceId: string
  referenceTitle: string
  matchScore: number
}

export function DealRfpDraftsSection({
  data,
  deal,
}: {
  data: DealRfpCockpitData
  deal: DealWithReferences
}) {
  const showSection = data.hasAnalysis && !data.isStale
  const drafts = data.draftRows

  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(null)

  if (!showSection) return null

  const dealContext = buildDealContextForKiEntwurf(deal)

  function openKiEntwurf(row: DealDeskDraftRow) {
    const ref = row.reference
    if (!ref?.id) return
    setActiveDraft({
      row,
      referenceId: ref.id,
      referenceTitle: ref.title,
      matchScore: ref.matchPercent,
    })
    setSheetOpen(true)
  }

  if (drafts.length === 0) {
    return (
      <Card id="drafts" className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{COPY.deals.cockpit.draftsTitle}</CardTitle>
          <CardDescription>{COPY.deals.cockpit.draftsEmpty}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card id="drafts" className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{COPY.deals.cockpit.draftsTitle}</CardTitle>
          <CardDescription>{COPY.deals.cockpit.draftsSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {drafts.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3"
            >
              <p className="text-sm font-semibold">{row.requirement}</p>
              {row.answer ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {row.answer}
                </p>
              ) : null}
              {row.reference ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                    ✓ {row.reference.title} ({row.reference.matchPercent}%)
                  </span>
                  {row.reference.id ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => openKiEntwurf(row)}>
                      {COPY.deals.cockpit.draftsGenerateCta}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                  <span>{COPY.deals.cockpit.draftsNoReference}</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {activeDraft ? (
        <KiEntwurfSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          referenceId={activeDraft.referenceId}
          referenceTitle={activeDraft.referenceTitle}
          matchScore={activeDraft.matchScore}
          dealId={deal.id}
          dealContext={`${dealContext}\n\nRFP-Anforderung:\n${activeDraft.row.requirement}`}
        />
      ) : null}
    </>
  )
}
