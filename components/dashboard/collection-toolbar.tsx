'use client'

import type { ReactNode } from 'react'

import {
  COLLECTION_TOOLBAR_SLOT_IDS,
  type CollectionToolbarSlotId,
} from '@/lib/dashboard/collection-toolbar-slots'
import { cn } from '@/lib/utils'

const SLOT_CLASS: Record<CollectionToolbarSlotId, string> = {
  'collection-search': 'relative min-w-0 flex-1',
  'collection-filter-primary': 'relative h-10 min-w-[11.5rem] shrink-0',
  'collection-filter-more': 'relative h-10 min-w-[6.75rem] shrink-0',
  'collection-view': 'relative h-10 min-w-[4.5rem] shrink-0',
  'collection-primary': 'relative h-10 min-w-[10.5rem] shrink-0',
  'collection-columns': 'relative h-10 min-w-[6.75rem] shrink-0',
}

export type CollectionToolbarSlots = Partial<Record<CollectionToolbarSlotId, ReactNode>>

export function CollectionToolbar({
  slots,
  trailing,
  className,
}: {
  slots: CollectionToolbarSlots
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-10 w-full min-w-0 items-center gap-2.5 sm:gap-3',
        className,
      )}
    >
      {COLLECTION_TOOLBAR_SLOT_IDS.map((id) => (
        <div
          key={id}
          data-slot={id}
          className={SLOT_CLASS[id]}
          aria-hidden={slots[id] == null ? true : undefined}
        >
          {slots[id] ?? null}
        </div>
      ))}
      {trailing}
    </div>
  )
}
