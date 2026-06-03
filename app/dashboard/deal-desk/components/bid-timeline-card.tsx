'use client'

import { CalendarClock, CalendarRange } from 'lucide-react'

import { BidDeadlineProgressTimeline } from '@/app/dashboard/deal-desk/components/bid-deadline-progress-timeline'
import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'
import { Button } from '@/components/ui/button'
import { downloadBidTimelineIcs } from '@/lib/deal-desk/bid-timeline-ics'
import { isVergabeMilestone } from '@/lib/deal-desk/bid-timeline-milestones'
import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'
import {
  deadlineCountdownBadgeClass,
  deadlineRowTitleClass,
  formatRelativeCountdownLabel,
} from '@/lib/deal-desk/bid-overview-meta'
import { daysUntil, formatDateDe, normalizeDueTime } from '@/lib/deal-desk/timeline-display'
import { cn } from '@/lib/utils'

/** Max. Fristen in der Bid-Übersicht */
export const BID_TIMELINE_MAX_ITEMS = 15
/** Ab dieser Anzahl wird die Liste in der Card scrollbar (~5 Zeilen sichtbar) */
const BID_TIMELINE_SCROLL_AFTER = 5
/** ~5 kompakte Einzeiler */
const BID_TIMELINE_LIST_MAX_HEIGHT = 'max-h-[17rem]'

const DEADLINE_ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_13rem_8rem] items-center gap-x-4'

type Props = {
  timelineItems: DealDeskTimelineItem[]
  customerName: string
  rfpTitle: string
  projectId?: string
  className?: string
  defaultOpen?: boolean
}

export function BidTimelineCard({
  timelineItems,
  customerName,
  rfpTitle,
  projectId,
  className,
  defaultOpen = false,
}: Props) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const allValidItems = [...timelineItems]
    .filter((it) => typeof it?.dueDate === 'string' && it.dueDate.length >= 10)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  /** Fristenliste ohne Vergabe (nur Zeitstrahl-Knoten links). */
  const sortedItems = allValidItems.filter((it) => !isVergabeMilestone(it.title))
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

  function formatDateTimeLine(dueDate: string, dueTime: string | null | undefined): string {
    const dateDe = formatDateDe(dueDate)
    const time = normalizeDueTime(dueTime)
    return time ? `${dateDe} · ${time} Uhr` : dateDe
  }

  const exportAction =
    displayItems.length > 0 ? (
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
    ) : null

  return (
    <BidOverviewCollapsibleCard
      defaultOpen={defaultOpen}
      className={className}
      contentClassName="pt-2 pb-6"
      headerActions={exportAction}
      pinnedBelowHeader={
        allValidItems.length > 0 ? (
          <BidDeadlineProgressTimeline
            timelineItems={allValidItems}
            className="mb-0"
          />
        ) : null
      }
      title={
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          Deal Deadlines
        </span>
      }
      description={
        <span>
          Aus dem RFP extrahierte Fristen — Titel, Datum und Countdown. Kalender-Import ohne
          geplanten Servicebeginn (erst nach Win relevant).
        </span>
      }
    >
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
                  'overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]'
                )
            )}
            aria-label={
              listScrollable ? `${displayItems.length} Fristen, scrollbar` : undefined
            }
          >
            {displayItems.map((it, idx) => {
              const dayCount = daysUntil(it.dueDate, now)
              const countdown = formatRelativeCountdownLabel(dayCount)

              return (
                <div
                  key={`${it.id}-${idx}`}
                  className={cn(
                    DEADLINE_ROW_GRID,
                    'rounded-xl border border-border bg-muted/30 px-4 py-3'
                  )}
                >
                  <span className={deadlineRowTitleClass(dayCount, it.title)} title={it.title}>
                    {it.title}
                  </span>
                  <span className="truncate text-sm tabular-nums leading-none text-muted-foreground">
                    {formatDateTimeLine(it.dueDate, it.dueTime)}
                  </span>
                  <span className="flex justify-end">
                    <span className={deadlineCountdownBadgeClass(dayCount)}>{countdown}</span>
                  </span>
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
    </BidOverviewCollapsibleCard>
  )
}
