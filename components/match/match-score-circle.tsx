'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/** Wireframe §14: Score-Kreis, zählt 0 → Ziel in 500 ms, font-mono, Farbe nach Threshold. */
export function MatchScoreCircle({ similarity01 }: { similarity01: number }) {
  const targetPct = Math.min(100, Math.max(0, Math.round(similarity01 * 100)))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    setDisplay(0)
    const start = performance.now()
    const duration = 500
    let raf = 0

    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 2
      setDisplay(Math.round(eased * targetPct))
      if (t < 1) raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [targetPct])

  const colorClass =
    similarity01 >= 0.85
      ? 'text-emerald-600 border-emerald-500/35'
      : similarity01 >= 0.7
        ? 'text-amber-600 border-amber-500/35'
        : 'text-muted-foreground border-border'

  return (
    <div
      className={cn(
        'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border-2 bg-muted/40 font-mono text-sm font-semibold tabular-nums',
        colorClass
      )}
      aria-label={`Ähnlichkeit ${display} Prozent`}
    >
      {display}%
    </div>
  )
}
