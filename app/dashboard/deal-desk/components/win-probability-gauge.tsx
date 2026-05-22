'use client'

import { cn } from '@/lib/utils'
import {
  winProbabilityRecommendationLabel,
  winProbabilityRingClass,
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
        <p
          className={cn(
            'mt-2 text-center text-[11px] font-semibold',
            winProbabilityValueClass(tone)
          )}
        >
          {winProbabilityRecommendationLabel(tone)}
        </p>
      ) : null}
    </div>
  )
}
