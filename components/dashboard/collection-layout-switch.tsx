'use client'

import { LayoutTwoColumnIcon } from '@hugeicons/core-free-icons'
import { Table2 } from 'lucide-react'

import { AccountsToolbarTooltip } from '@/app/(app)/accounts/components/accounts-toolbar-tooltip'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export type CollectionLayoutMode = 'table' | 'inbox'

type Props = {
  value: CollectionLayoutMode
  onChange: (value: CollectionLayoutMode) => void
}

export function CollectionLayoutSwitch({ value, onChange }: Props) {
  const isInbox = value === 'inbox'
  const label = isInbox ? COPY.dashboard.layoutRead : COPY.dashboard.layoutList

  return (
    <AccountsToolbarTooltip label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={isInbox}
        aria-label={isInbox ? 'Zur Listenansicht wechseln' : 'Zur Leseansicht wechseln'}
        onClick={() => onChange(isInbox ? 'table' : 'inbox')}
        className="relative inline-flex h-10 w-16 shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted/50 p-0.5 transition-colors hover:bg-muted/70"
      >
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-200 ease-out',
            isInbox ? 'translate-x-6' : 'translate-x-0',
          )}
        >
          {isInbox ? (
            <AppIcon
              icon={LayoutTwoColumnIcon}
              size={14}
              className="text-muted-foreground"
            />
          ) : (
            <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
          )}
        </span>
      </button>
    </AccountsToolbarTooltip>
  )
}
