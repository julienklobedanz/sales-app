'use client'

import {
  EVIDENCE_PROOF_SEGMENT_DESCRIPTIONS,
  EVIDENCE_PROOF_SEGMENT_LABELS,
  type EvidenceLibraryMode,
} from '@/lib/evidence/evidence-library-mode'
import { cn } from '@/lib/utils'

const SEGMENTS: EvidenceLibraryMode[] = ['references', 'certificates']

export function EvidenceProofSegmentSwitch({
  value,
  onChange,
  className,
}: {
  value: EvidenceLibraryMode
  onChange: (mode: EvidenceLibraryMode) => void
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
            aria-controls={`evidence-proof-panel-${segment}`}
            id={`evidence-proof-tab-${segment}`}
            onClick={() => onChange(segment)}
            className={cn(
              'min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors sm:flex-none sm:min-w-[11rem]',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            )}
          >
            <span className="block text-sm font-medium leading-tight">
              {EVIDENCE_PROOF_SEGMENT_LABELS[segment]}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              {EVIDENCE_PROOF_SEGMENT_DESCRIPTIONS[segment]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
