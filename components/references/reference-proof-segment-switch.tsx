'use client'

import {
  REFERENCE_PROOF_SEGMENT_DESCRIPTIONS,
  REFERENCE_PROOF_SEGMENT_LABELS,
  type ReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    <TooltipProvider delayDuration={300}>
      <div
        role="tablist"
        aria-label="Nachweis-Art"
        className={cn(
          'inline-flex h-10 w-auto shrink-0 items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-1',
          className
        )}
      >
        {SEGMENTS.map((segment) => {
          const selected = value === segment
          return (
            <Tooltip key={segment}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`reference-proof-panel-${segment}`}
                  id={`reference-proof-tab-${segment}`}
                  onClick={() => onChange(segment)}
                  className={cn(
                    'flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors',
                    selected
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                >
                  {REFERENCE_PROOF_SEGMENT_LABELS[segment]}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REFERENCE_PROOF_SEGMENT_DESCRIPTIONS[segment]}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
