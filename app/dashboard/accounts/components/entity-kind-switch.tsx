'use client'

import { Building2, User } from 'lucide-react'

import { AccountsToolbarTooltip } from './accounts-toolbar-tooltip'
import type { CompanyEntityKind } from '@/lib/accounts/company-entity'
import { cn } from '@/lib/utils'

type Props = {
  value: CompanyEntityKind
  onChange: (value: CompanyEntityKind) => void
}

export function EntityKindSwitch({ value, onChange }: Props) {
  const isPartner = value === 'partner'
  const label = isPartner ? 'Partner-Ansicht' : 'Account-Ansicht'

  return (
    <AccountsToolbarTooltip label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={isPartner}
        aria-label={isPartner ? 'Zu Accounts wechseln' : 'Zu Partnern wechseln'}
        onClick={() => onChange(isPartner ? 'account' : 'partner')}
        className="relative inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted/50 p-0.5 transition-colors hover:bg-muted/70"
      >
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-200 ease-out',
            isPartner ? 'translate-x-[1.125rem]' : 'translate-x-0'
          )}
        >
          {isPartner ? (
            <User className="size-3.5 text-slate-600" aria-hidden />
          ) : (
            <Building2 className="size-3.5 text-slate-600" aria-hidden />
          )}
        </span>
      </button>
    </AccountsToolbarTooltip>
  )
}
