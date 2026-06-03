'use client'

import { cn } from '@/lib/utils'

type Props = {
  tags: string[]
  className?: string
  /** Kompaktere Pills für die Projekt-Titel-Card */
  compact?: boolean
}

export function DealDeskDomainTags({ tags, className, compact = false }: Props) {
  if (tags.length === 0) return null

  return (
    <div
      className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-2', className)}
      role="list"
      aria-label="Domänen-Klassifizierung"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          role="listitem"
          className={cn(
            'border border-border/60 bg-secondary font-medium text-secondary-foreground',
            compact
              ? 'rounded px-1.5 py-0.5 text-[10px] leading-none'
              : 'rounded-md px-2.5 py-1 text-xs tracking-wide'
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
