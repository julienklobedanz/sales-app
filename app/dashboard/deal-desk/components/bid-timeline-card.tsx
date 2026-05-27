'use client'

import { CalendarRange } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { downloadBidTimelineIcs } from '@/lib/deal-desk/bid-timeline-ics'
import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'
import { getTimelineItemVisual } from '@/lib/deal-desk/timeline-item-visual'
import { cn } from '@/lib/utils'

const MS_DAY = 24 * 60 * 60 * 1000

function formatDateDe(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function daysUntil(iso: string, now: Date) {
  const d = new Date(`${iso}T12:00:00`)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / MS_DAY)
}

function formatCountdown(days: number) {
  if (days < 0) return `(vor ${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'en'})`
  if (days === 0) return '(heute)'
  return `(in ${days} Tag${days === 1 ? '' : 'en'})`
}

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

  function handleExportIcs() {
    downloadBidTimelineIcs({
      customerName,
      rfpTitle,
      items: sortedItems,
      projectId,
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">Bid-Timeline / Fristen</CardTitle>
            <CardDescription>
              Aus dem RFP extrahierte Deadlines (Datum + Countdown).
            </CardDescription>
          </div>
          {sortedItems.length > 0 ? (
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
        {sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine konkreten Fristen/Deadlines im Dokument erkannt.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedItems.map((it, idx) => {
              const days = daysUntil(it.dueDate, now)
              const visual = getTimelineItemVisual(it.title)
              const Icon = visual.Icon

              return (
                <div
                  key={`${it.id}-${idx}`}
                  className="rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-md p-1.5',
                        visual.wrapClass
                      )}
                    >
                      <Icon className={cn('size-4', visual.iconClass)} aria-hidden />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatDateDe(it.dueDate)}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-normal text-muted-foreground',
                          visual.countdownClass
                        )}
                      >
                        {formatCountdown(days)}
                      </span>
                      <span
                        className="mx-1 hidden h-4 w-px shrink-0 bg-slate-200 sm:inline-block"
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-slate-700">{it.title}</span>
                    </div>
                  </div>
                  {it.evidence ? (
                    <p className="mt-2 line-clamp-2 pl-11 text-xs text-muted-foreground sm:pl-12">
                      Beleg: {it.evidence}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
