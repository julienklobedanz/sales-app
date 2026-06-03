'use client'

import type { ReactNode } from 'react'
import { Calendar, Coins, UserRound } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { BidOverviewMeta } from '@/lib/deal-desk/bid-overview-meta'
import { cn } from '@/lib/utils'

type Props = {
  meta: BidOverviewMeta
  className?: string
}

const META_CELL_CLASS =
  'flex min-w-0 flex-col gap-2.5 px-6 py-5 first:pt-5 last:pb-5 sm:py-5'

const META_LABEL_CLASS =
  'flex h-4 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'

const META_VALUE_SLOT_CLASS = 'flex min-h-10 flex-col justify-center'

export function BidOverviewMetaBar({ meta, className }: Props) {
  return (
    <div
      className={cn(
        'border-t border-border/80 bg-gradient-to-b from-muted/15 to-muted/35',
        className
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3">
        <MetaCell className="border-b border-border/60 sm:border-b-0 sm:border-r sm:border-border/60">
          <MetaLabel icon={<Coins className="size-3.5 shrink-0 opacity-70" aria-hidden />}>
            Volumen
          </MetaLabel>
          <MetaValueSlot>
            <span
              className="text-sm font-semibold leading-snug tracking-tight text-foreground tabular-nums"
              title={meta.volumeIsAiEstimate ? 'Geschätztes Volumen (KI)' : undefined}
            >
              {meta.volume}
            </span>
          </MetaValueSlot>
        </MetaCell>

        <MetaCell className="border-b border-border/60 sm:border-b-0 sm:border-r sm:border-border/60">
          <MetaLabel icon={<Calendar className="size-3.5 shrink-0 opacity-70" aria-hidden />}>
            Nächste Frist
          </MetaLabel>
          <MetaValueSlot>
            <span className="text-sm font-semibold leading-tight text-foreground tabular-nums">
              {meta.nextDeadlineDate}
              {meta.nextDeadlineDetail ? (
                <span className="font-medium text-muted-foreground">
                  {' '}
                  ({meta.nextDeadlineDetail})
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                'mt-0.5 text-xs font-medium tabular-nums text-muted-foreground',
                !meta.nextDeadlineTime && 'invisible select-none'
              )}
            >
              {meta.nextDeadlineTime ?? '\u00a0'}
            </span>
          </MetaValueSlot>
        </MetaCell>

        <MetaCell>
          <MetaLabel icon={<UserRound className="size-3.5 shrink-0 opacity-70" aria-hidden />}>
            Owner
          </MetaLabel>
          <MetaValueSlot>
            <span className="inline-flex min-w-0 items-center gap-2.5">
              <Avatar
                size="sm"
                className="size-8 shrink-0 border border-border/80 bg-background shadow-sm"
              >
                {meta.ownerAvatarUrl ? (
                  <AvatarImage
                    src={meta.ownerAvatarUrl}
                    alt={meta.ownerName}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="flex items-center justify-center bg-muted text-[10px] font-semibold leading-none text-foreground">
                  {meta.ownerInitials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-semibold leading-none text-foreground">
                {meta.ownerName}
              </span>
            </span>
          </MetaValueSlot>
        </MetaCell>
      </div>
    </div>
  )
}

function MetaCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(META_CELL_CLASS, className)}>{children}</div>
}

function MetaLabel({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className={META_LABEL_CLASS}>
      {icon}
      <span>{children}</span>
    </div>
  )
}

function MetaValueSlot({ children }: { children: ReactNode }) {
  return <div className={META_VALUE_SLOT_CLASS}>{children}</div>
}
