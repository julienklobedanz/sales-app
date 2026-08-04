'use client'

import { AccountsToolbarTooltip } from './accounts-toolbar-tooltip'
import { cn } from '@/lib/utils'
import { ActivityPulseIcon } from './activity-pulse-icon'

export type AccountSortMode = 'az' | 'activity'

type Props = {
  value: AccountSortMode
  onChange: (value: AccountSortMode) => void
}

export function AccountSortSwitch({ value, onChange }: Props) {
  const isActivity = value === 'activity'
  const label = isActivity ? 'Nach Priorität' : 'A-Z'

  return (
    <AccountsToolbarTooltip label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={isActivity}
        aria-label={
          isActivity ? 'Nach Priorität sortieren' : 'Alphabetisch sortieren (A-Z)'
        }
        onClick={() => onChange(isActivity ? 'az' : 'activity')}
        className="relative inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted/50 p-0.5 transition-colors hover:bg-muted/70"
      >
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-200 ease-out',
            isActivity ? 'translate-x-[1.125rem]' : 'translate-x-0',
          )}
        >
          {isActivity ? (
            <ActivityPulseIcon className="text-slate-600" />
          ) : (
            <span className="text-[10px] font-semibold leading-none tracking-tight text-slate-600">
              A-Z
            </span>
          )}
        </span>
      </button>
    </AccountsToolbarTooltip>
  )
}
