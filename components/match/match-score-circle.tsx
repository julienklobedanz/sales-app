'use client'

import { cn } from '@/lib/utils'
import type { MatchStrengthDisplay } from '@/lib/match/match-strength'

const TIER_COLOR: Record<MatchStrengthDisplay['tier'], string> = {
  excellent: 'text-emerald-600 border-emerald-500/35',
  good: 'text-emerald-600 border-emerald-500/30',
  moderate: 'text-amber-600 border-amber-500/35',
  low: 'text-muted-foreground border-border',
}

/** Match-Stärke-Kreis: kurzes Relevanz-Label, Farbe nach Tier. */
export function MatchScoreCircle({ strength }: { strength: MatchStrengthDisplay }) {
  return (
    <div
      className={cn(
        'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border-2 bg-muted/40 px-1 text-center text-[10px] font-semibold leading-tight',
        TIER_COLOR[strength.tier]
      )}
      aria-label={strength.ariaLabel}
    >
      {strength.labelShort}
    </div>
  )
}
