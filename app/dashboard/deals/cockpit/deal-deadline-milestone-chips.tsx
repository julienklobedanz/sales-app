'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  buildDeadlineMilestoneChips,
  type DeadlineMilestoneChip,
} from '@/lib/deals/deadline-milestone-chips'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import type { OrgDateDisplayFormat } from '@/lib/format'

function MilestoneChip({ chip }: { chip: DeadlineMilestoneChip }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex min-w-[6.5rem] max-w-[11rem] shrink-0 flex-col rounded-lg border px-3 py-2 text-left',
            chip.isNextFuture && 'ring-2 ring-primary/40',
            chip.isOverdue && 'border-destructive/40 bg-destructive/5',
            chip.isToday &&
              !chip.isOverdue &&
              'border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/30',
            !chip.isOverdue && !chip.isToday && 'border-border bg-card',
          )}
        >
          <span className="text-[11px] font-medium text-muted-foreground line-clamp-3 leading-tight">
            {chip.shortLabel}
          </span>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums tracking-tight',
              chip.isOverdue && 'text-destructive',
            )}
          >
            {chip.relativeLabel}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        <p className="font-medium">{chip.fullLabel}</p>
        <p className="text-muted-foreground">{chip.absoluteDateLabel}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function DealDeadlineMilestoneChips({
  deadlines,
  orgDateDisplayFormat = 'de-DE',
  className,
}: {
  deadlines: DealDeadlineRow[]
  orgDateDisplayFormat?: OrgDateDisplayFormat
  className?: string
}) {
  const chips = buildDeadlineMilestoneChips(deadlines, {
    dateDisplayFormat: orgDateDisplayFormat,
  })
  if (chips.length === 0) return null

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {chips.map((chip) => (
          <MilestoneChip key={chip.id} chip={chip} />
        ))}
      </div>
    </TooltipProvider>
  )
}
