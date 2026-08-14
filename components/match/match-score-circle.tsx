'use client'

import { cn } from '@/lib/utils'
import type { MatchStrengthDisplay } from '@/lib/match/match-strength'

/** D2: Prozent ist kein Status — Kreis bleibt neutral, Label trägt die Stufe. */
const CIRCLE_TONE = 'text-foreground border-border'

const SIZE_CLASS = {
  default: 'h-[3.25rem] w-[3.25rem] px-1 text-[10px]',
  sm: 'h-9 w-9 px-0.5 text-[10px] tabular-nums',
} as const

type MatchScoreCircleProps = {
  strength: MatchStrengthDisplay
  /** Kompakte Variante für Tabellenzeilen. */
  size?: keyof typeof SIZE_CLASS
  /** Bei `size="sm"`: Prozentzahl im Ring (0–100). */
  percent?: number
}

/** Match-Stärke-Kreis: kurzes Relevanz-Label, Farbe nach Tier. */
export function MatchScoreCircle({
  strength,
  size = 'default',
  percent,
}: MatchScoreCircleProps) {
  const content =
    size === 'sm' && typeof percent === 'number' ? `${percent}%` : strength.labelShort

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 bg-muted/40 text-center font-semibold leading-tight',
        SIZE_CLASS[size],
        CIRCLE_TONE,
      )}
      aria-label={strength.ariaLabel}
    >
      {content}
    </div>
  )
}
