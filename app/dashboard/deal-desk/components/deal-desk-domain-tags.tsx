'use client'

import { cn } from '@/lib/utils'

type Props = {
  tags: string[]
  className?: string
}

export function DealDeskDomainTags({ tags, className }: Props) {
  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="list" aria-label="Domänen-Klassifizierung">
      {tags.map((tag) => (
        <span
          key={tag}
          role="listitem"
          className="rounded-md border border-border/60 bg-secondary px-2.5 py-1 text-xs font-medium tracking-wide text-secondary-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
