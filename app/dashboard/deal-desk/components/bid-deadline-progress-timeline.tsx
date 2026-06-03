'use client'

import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'
import { buildBidProgressTimeline } from '@/lib/deal-desk/bid-timeline-milestones'
import { cn } from '@/lib/utils'

type Props = {
  timelineItems: DealDeskTimelineItem[]
  className?: string
}

/** Wie Fristenzeilen (`px-4`) — gleicher horizontaler Rhythmus in der Card. */
const TRACK_PADDING_X = 'px-4'
/** Halber Punkt-Durchmesser (size-3), damit 0 % / 100 % auf der Linie enden. */
const DOT_EDGE_INSET = 'px-1.5'

/** Vertikale Mitte der Linie. */
const TRACK_LINE_Y_PX = 14

export function BidDeadlineProgressTimeline({ timelineItems, className }: Props) {
  const points = buildBidProgressTimeline(timelineItems)
  if (!points || points.length === 0) return null

  const dotRowHeight = TRACK_LINE_Y_PX * 2

  return (
    <div
      className={cn('mb-4 w-full overflow-visible', TRACK_PADDING_X, className)}
      role="img"
      aria-label="Kern-Fristen auf dem Zeitstrahl von Vergabe bis Angebotsabgabe"
    >
      <div className={cn('relative w-full overflow-visible', DOT_EDGE_INSET)}>
        <div className="relative w-full overflow-visible" style={{ minHeight: '5.25rem' }}>
          <div
            className="pointer-events-none absolute inset-x-0 top-[14px] h-px -translate-y-1/2 bg-border"
            aria-hidden
          />

          {points.map((point) => {
            const isToday = point.kind === 'today'
            const isLineStart = point.kind === 'vergabe' || point.positionPct <= 0
            const isLineEnd = point.label === 'ABGABE' || point.positionPct >= 100

            return (
              <div
                key={point.id}
                className={cn(
                  'absolute top-0 flex flex-col overflow-visible',
                  isLineStart && 'left-0 items-start',
                  isLineEnd && 'right-0 left-auto items-end',
                  !isLineStart && !isLineEnd && '-translate-x-1/2 items-center'
                )}
                style={
                  !isLineStart && !isLineEnd
                    ? { left: `${point.positionPct}%` }
                    : undefined
                }
              >
                <div
                  className={cn(
                    'flex items-center',
                    isLineStart && 'justify-start',
                    isLineEnd && 'justify-end',
                    !isLineStart && !isLineEnd && 'justify-center'
                  )}
                  style={{ height: dotRowHeight }}
                >
                  <span
                    className={cn(
                      'relative z-10 box-border block shrink-0 rounded-full border-2 border-white shadow-none ring-0',
                      isToday ? 'size-3 bg-primary' : 'size-2.5 bg-muted-foreground/55'
                    )}
                    aria-hidden
                  />
                </div>
                <div
                  className={cn(
                    'flex max-w-[7.5rem] flex-col',
                    isLineStart && 'items-start text-left',
                    isLineEnd && 'items-end text-right',
                    !isLineStart && !isLineEnd && 'items-center text-center'
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase leading-tight tracking-[0.08em]',
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {point.label}
                  </span>
                  {point.sublabel ? (
                    <span
                      className={cn(
                        'mt-0.5 text-xs font-bold tabular-nums leading-none',
                        isToday ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {point.sublabel}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
