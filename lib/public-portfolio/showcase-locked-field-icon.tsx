'use client'

import { Lock } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const SHOWCASE_FIELD_LOCKED_LABEL = 'Angabe nicht freigegeben'

export function ShowcaseLockedFieldIcon() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={SHOWCASE_FIELD_LOCKED_LABEL}
            className="inline-flex cursor-help items-center text-muted-foreground"
          >
            <Lock className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{SHOWCASE_FIELD_LOCKED_LABEL}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
