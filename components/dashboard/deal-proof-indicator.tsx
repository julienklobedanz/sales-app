'use client'

import { MatchScoreCircle } from '@/components/match/match-score-circle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DealProofDisplay } from '@/lib/deals/deal-proof-display'

export function DealProofIndicator({
  display,
  interactive,
}: {
  display: DealProofDisplay
  interactive: boolean
}) {
  if (display.kind === 'empty') {
    return (
      <div
        className={
          interactive
            ? 'flex justify-center text-muted-foreground'
            : 'text-muted-foreground'
        }
        aria-label="Keine Referenzen"
      >
        —
      </div>
    )
  }

  if (display.kind === 'count_only') {
    const count = (
      <span
        tabIndex={interactive ? 0 : undefined}
        className={
          interactive
            ? 'cursor-default tabular-nums text-muted-foreground'
            : 'tabular-nums text-muted-foreground'
        }
        aria-label={`${display.count} Referenzen, manuell verknüpft`}
      >
        {display.count}
      </span>
    )
    if (!interactive) return count
    return (
      <div className="flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>{count}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            Manuell verknüpft — kein Match-Score aus Smart Match
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  const scoreLabel = `${display.strength.ariaLabel} · ${display.percent}%`
  const circle = (
    <MatchScoreCircle
      size="sm"
      strength={display.strength}
      percent={display.percent}
    />
  )

  if (!interactive) {
    return (
      <div className="flex items-center gap-1.5" aria-label={scoreLabel}>
        <span className="tabular-nums text-muted-foreground" aria-hidden>
          {display.count}
        </span>
        <span aria-hidden className="inline-flex">
          {circle}
        </span>
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
            {circle}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {scoreLabel}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
