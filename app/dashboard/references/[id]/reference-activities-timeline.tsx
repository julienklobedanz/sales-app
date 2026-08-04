'use client'

import { useState } from 'react'
import { ChevronDown } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import type { ReferenceActivityItem } from './reference-detail-activities'

export function ReferenceActivitiesTimeline({
  items,
}: {
  items: ReferenceActivityItem[]
}) {
  const [open, setOpen] = useState(false)
  const hasMore = items.length > 1
  const visible = open ? items : items.slice(0, 1)

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Noch keine Ereignisse.</p>
  }

  return (
    <div className="space-y-0">
      <ol className="relative ml-2 border-l pl-6">
        {visible.map((a) => (
          <li key={a.id} className="pb-4 last:pb-0">
            <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-muted ring-4 ring-background" />
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{a.title}</div>
              <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {new Date(a.at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
            </div>
            {a.detail ? (
              <div className="mt-1 text-xs text-muted-foreground">{a.detail}</div>
            ) : null}
          </li>
        ))}
      </ol>
      {hasMore ? (
        <div className="flex justify-center border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            <AppIcon
              icon={ChevronDown}
              size={18}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
            <span>{open ? 'Weniger anzeigen' : `${items.length - 1} weitere`}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
