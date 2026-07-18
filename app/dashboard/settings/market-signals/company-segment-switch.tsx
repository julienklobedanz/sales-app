'use client'

import { cn } from '@/lib/utils'

export type CompanyWatchSegment = 'all' | 'neu' | 'bestand'

type Props = {
  value: CompanyWatchSegment
  onChange: (value: CompanyWatchSegment) => void
}

const SEGMENTS: { value: CompanyWatchSegment; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'neu', label: 'Neukunden' },
  { value: 'bestand', label: 'Bestand' },
]

/** Segment-Chips für die Watchlist: Alle | Neukunden | Bestand. */
export function CompanySegmentSwitch({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Account-Segment"
      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1"
    >
      {SEGMENTS.map((segment) => {
        const active = value === segment.value
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
