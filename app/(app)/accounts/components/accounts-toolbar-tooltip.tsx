'use client'

import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const TOOLTIP_SIDE_OFFSET = 6

type Props = {
  label: string
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

/** Einheitliches Hover-Label (schwarz, Pfeil, Fade/Zoom) für die Account-Übersicht */
export function AccountsToolbarTooltip({
  label,
  children,
  side = 'bottom',
  className,
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={TOOLTIP_SIDE_OFFSET}
        className={cn('text-xs', className)}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
