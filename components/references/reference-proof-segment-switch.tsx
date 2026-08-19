'use client'

import {
  REFERENCE_PROOF_SEGMENT_DESCRIPTIONS,
  REFERENCE_PROOF_SEGMENT_LABELS,
  type ReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
      <Tabs
        value={value}
        onValueChange={(next) => onChange(next as ReferenceLibraryMode)}
        className={className}
      >
        <TabsList aria-label="Nachweis-Art">
          {SEGMENTS.map((segment) => (
            <Tooltip key={segment}>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={segment}
                  aria-controls={`reference-proof-panel-${segment}`}
                  id={`reference-proof-tab-${segment}`}
                >
                  {REFERENCE_PROOF_SEGMENT_LABELS[segment]}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REFERENCE_PROOF_SEGMENT_DESCRIPTIONS[segment]}
              </TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>
    </TooltipProvider>
  )
}
