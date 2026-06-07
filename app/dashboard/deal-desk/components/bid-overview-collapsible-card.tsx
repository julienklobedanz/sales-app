'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const COLLAPSE_CONTENT_CLASS =
  'grid transition-all duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]'

type Props = {
  defaultOpen?: boolean
  title: ReactNode
  description?: ReactNode
  /** Links neben dem Trigger (z. B. Checkbox) — außerhalb des Collapsible-Buttons. */
  headerPrefix?: ReactNode
  /** Aktionen im Header (z. B. Export) — außerhalb des Collapsible-Buttons. */
  headerActions?: ReactNode
  /** Bleibt sichtbar, wenn der Rest zugeklappt ist (z. B. Zeitstrahl). */
  pinnedBelowHeader?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function BidOverviewCollapsibleCard({
  defaultOpen = true,
  title,
  description,
  headerPrefix,
  headerActions,
  pinnedBelowHeader,
  children,
  className,
  contentClassName,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className={cn('flex flex-col gap-0 overflow-hidden py-0 shadow-sm', className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="grid-rows-1 space-y-0 border-b-0 p-0 !pb-0">
          <div
            className={cn(
              'flex w-full items-center gap-3 rounded-t-xl px-6 py-4 transition-colors hover:bg-muted/30',
              !open && !pinnedBelowHeader && 'rounded-b-xl'
            )}
          >
            {headerPrefix ? <div className="shrink-0">{headerPrefix}</div> : null}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer select-none items-center justify-between gap-3 border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-expanded={open}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {title}
                  {description ? (
                    <div className="text-sm font-normal text-muted-foreground">{description}</div>
                  ) : null}
                </div>
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground"
                  aria-hidden
                >
                  <ChevronDown
                    className={cn(
                      'size-4 transition-transform duration-200',
                      open && 'rotate-180'
                    )}
                  />
                </span>
              </button>
            </CollapsibleTrigger>
            {headerActions ? (
              <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
            ) : null}
          </div>
        </CardHeader>

        {pinnedBelowHeader ? (
          <div className="px-6 pb-2">{pinnedBelowHeader}</div>
        ) : null}

        <CollapsibleContent className={COLLAPSE_CONTENT_CLASS}>
          <div className="min-h-0 overflow-hidden">
            <CardContent
              className={cn(
                open ? 'border-t border-border pt-3' : 'border-t-0 p-0',
                contentClassName
              )}
            >
              {children}
            </CardContent>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
