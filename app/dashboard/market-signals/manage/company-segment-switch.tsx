'use client'

import { Building2, Target } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type CompanyWatchSegment = 'bestand' | 'neu'

type Props = {
  value: CompanyWatchSegment
  onChange: (value: CompanyWatchSegment) => void
}

/** Rund wie EntityKindSwitch: links Neukunden (Target), rechts Bestandskunden (Building2). */
export function CompanySegmentSwitch({ value, onChange }: Props) {
  const isBestand = value === 'bestand'
  const label = isBestand ? 'Bestandskunden' : 'Neukunden'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="switch"
          aria-checked={isBestand}
          aria-label={isBestand ? 'Zu Neukunden wechseln' : 'Zu Bestandskunden wechseln'}
          onClick={() => onChange(isBestand ? 'neu' : 'bestand')}
          className="relative inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted/50 p-0.5 transition-colors hover:bg-muted/70"
        >
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-200 ease-out',
              isBestand ? 'translate-x-[1.125rem]' : 'translate-x-0'
            )}
          >
            {isBestand ? (
              <Building2 className="size-3.5 text-slate-600" aria-hidden />
            ) : (
              <Target className="size-3.5 text-slate-600" aria-hidden />
            )}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
