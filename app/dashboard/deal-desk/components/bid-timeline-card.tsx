'use client'

import { CalendarRange } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { downloadBidTimelineIcs } from '@/lib/deal-desk/bid-timeline-ics'
import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'
import { formatDealDeadlineLabel } from '@/lib/deal-desk/timeline-display'
import { getTimelineItemVisual } from '@/lib/deal-desk/timeline-item-visual'
import { cn } from '@/lib/utils'

/** Max. Fristen in der Bid-Übersicht */
export const BID_TIMELINE_MAX_ITEMS = 15
/** Ab dieser Anzahl wird die Liste in der Card scrollbar (~5 Zeilen sichtbar) */
const BID_TIMELINE_SCROLL_AFTER = 5
/** ~5 kompakte Zeilen (py-3 + eine Textzeile + gap-2) */
const BID_TIMELINE_LIST_MAX_HEIGHT = 'max-h-[19.5rem]'

type Props = {
  timelineItems: DealDeskTimelineItem[]
  customerName: string
  rfpTitle: string
  projectId?: string
  className?: string
}

export function BidTimelineCard({
  timelineItems,
  customerName,
  rfpTitle,
  projectId,
  className,
}: Props) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const sortedItems = [...timelineItems]
    .filter((it) => typeof it?.dueDate === 'string' && it.dueDate.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const displayItems = sortedItems.slice(0, BID_TIMELINE_MAX_ITEMS)
  const truncatedCount = sortedItems.length - displayItems.length
  const listScrollable = displayItems.length > BID_TIMELINE_SCROLL_AFTER

  function handleExportIcs() {
    downloadBidTimelineIcs({
      customerName,
      rfpTitle,
      items: displayItems,
      projectId,
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">Deal Deadlines</CardTitle>
            <CardDescription>
              Aus dem RFP extrahierte Fristen (Datum, Countdown, ggf. Uhrzeit). Kalender-Import als
              ganztägige Termine.
            </CardDescription>
          </div>
          {displayItems.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex shrink-0 items-center gap-2 text-xs font-medium"
              onClick={handleExportIcs}
            >
              <CalendarRange className="size-3.5" aria-hidden />
              In Kalender importieren
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine konkreten Fristen/Deadlines im Dokument erkannt.
          </p>
        ) : (
          <>
            <div
              className={cn(
                'space-y-2',
                listScrollable &&
                  cn(
                    BID_TIMELINE_LIST_MAX_HEIGHT,
                    'overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]'
                  )
              )}
              aria-label={
                listScrollable
                  ? `${displayItems.length} Fristen, scrollbar`
                  : undefined
              }
            >
              {displayItems.map((it, idx) => {
                const visual = getTimelineItemVisual(it.title)
                const Icon = visual.Icon
                const label = formatDealDeadlineLabel(it, now)

                return (
                  <div
                    key={`${it.id}-${idx}`}
                    className="flex min-h-10 items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2"
                  >
                    <div
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md',
                        visual.wrapClass
                      )}
                    >
                      <Icon className={cn('size-4', visual.iconClass)} aria-hidden />
                    </div>
                    <p className="min-w-0 flex-1 text-sm leading-snug text-slate-900">
                      <span className="font-medium">{label}</span>
                      {it.evidence ? (
                        <>
                          <span className="text-muted-foreground/70"> · </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            Beleg: {it.evidence}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                )
              })}
            </div>
            {listScrollable ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {displayItems.length} Fristen — scrollen für alle Einträge.
              </p>
            ) : null}
            {truncatedCount > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {truncatedCount} weitere Frist{truncatedCount === 1 ? '' : 'en'} nicht angezeigt
                (max. {BID_TIMELINE_MAX_ITEMS} in der Übersicht).
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
