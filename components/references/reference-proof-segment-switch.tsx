'use client'

import {
  REFERENCE_PROOF_SEGMENT_DESCRIPTIONS,
  REFERENCE_PROOF_SEGMENT_LABELS,
  type ReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode'
import { cn } from '@/lib/utils'

const SEGMENTS: ReferenceLibraryMode[] = ['references', 'certificates']

export function ReferenceProofSegmentSwitch({
  value,
  onChange,
  className,
}: {
  value: ReferenceLibraryMode
  onChange: (mode: ReferenceLibraryMode) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Nachweis-Art"
      className={cn(
        'inline-flex w-full max-w-xl flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 sm:w-auto',
        className
      )}
    >
      {SEGMENTS.map((segment) => {
        const selected = value === segment
        return (
          <button
            key={segment}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`reference-proof-panel-${segment}`}
            id={`reference-proof-tab-${segment}`}
            onClick={() => onChange(segment)}
            className={cn(
              'min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors sm:flex-none sm:min-w-[11rem]',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            )}
          >
            <span className="block text-sm font-medium leading-tight">
              {REFERENCE_PROOF_SEGMENT_LABELS[segment]}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              {REFERENCE_PROOF_SEGMENT_DESCRIPTIONS[segment]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
