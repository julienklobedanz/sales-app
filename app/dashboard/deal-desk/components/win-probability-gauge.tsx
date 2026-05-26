'use client'

import { Info } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  winProbabilityRecommendationLabel,
  winProbabilityRingClass,
  winProbabilityScoreLegend,
  winProbabilityTone,
  winProbabilityValueClass,
} from '@/lib/deal-desk/win-probability'

export function WinProbabilityGauge({
  value,
  size = 140,
  className,
  showRecommendation = true,
}: {
  value: number
  size?: number
  className?: string
  showRecommendation?: boolean
}) {
  const pct = Math.min(100, Math.max(0, value))
  const tone = winProbabilityTone(pct)
  const stroke = 10
  const r = (size - stroke) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/40"
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              'transition-[stroke-dashoffset] duration-700',
              winProbabilityRingClass(tone)
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'text-3xl font-bold tabular-nums tracking-tight',
              winProbabilityValueClass(tone)
            )}
          >
            {pct}%
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Win Prob.
          </span>
        </div>
      </div>
      {showRecommendation ? (
        <TooltipProvider delayDuration={200}>
          <div
            className={cn(
              'mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold',
              winProbabilityValueClass(tone)
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Score-Schwellenwerte anzeigen"
                >
                  <Info className="size-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs">
                {winProbabilityScoreLegend()}
              </TooltipContent>
            </Tooltip>
            <span>{winProbabilityRecommendationLabel(tone)}</span>
          </div>
        </TooltipProvider>
      ) : null}
    </div>
  )
}
