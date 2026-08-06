'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { accountStatusDisplay } from '@/lib/accounts/account-status-display'
import {
  ACCOUNT_STATUS_FORM_OPTIONS,
  type AccountStatusValue,
} from '@/lib/accounts/account-status'
import { updateCompanyAccountStatus } from '../actions'

const SELECTABLE_STATUSES = ACCOUNT_STATUS_FORM_OPTIONS.filter(
  (o) => o.value !== '__none__',
)

export function AccountStatusBadge({
  status,
  className,
}: {
  status: AccountStatusValue | null | undefined
  className?: string
}) {
  const display = accountStatusDisplay(status)

  if (!display) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 border-sky-200/80 bg-sky-50 text-[10px] font-medium text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100',
          className,
        )}
      >
        Target
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 text-[10px] font-medium', display.className, className)}
    >
      {display.label}
    </Badge>
  )
}

export function AccountStatusPicker({
  companyId,
  status,
  canManage,
  variant = 'badge',
  className,
}: {
  companyId: string
  status: AccountStatusValue | null
  canManage: boolean
  variant?: 'badge' | 'button'
  className?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const display = accountStatusDisplay(status)

  async function handleSelect(next: AccountStatusValue | null) {
    if (!canManage || pending) return
    setPending(true)
    try {
      const result = await updateCompanyAccountStatus(companyId, next)
      if (!result.success) {
        toast.error(result.error ?? 'Status konnte nicht gespeichert werden.')
        return
      }
      toast.success('Kundenstatus aktualisiert.')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (!canManage) {
    return <AccountStatusBadge status={status} className={className} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant === 'button' ? 'outline' : 'ghost'}
          size="sm"
          className={cn(
            variant === 'badge' && 'h-auto shrink-0 px-0 py-0 hover:bg-transparent',
            variant === 'button' && 'h-9 gap-1.5',
            className,
          )}
          disabled={pending}
          onClick={(e) => e.stopPropagation()}
        >
          {pending ? (
            <AppIcon icon={Loader} size={14} className="animate-spin" />
          ) : variant === 'button' ? (
            <span className="text-sm font-medium">{display?.label ?? 'Target'}</span>
          ) : (
            <AccountStatusBadge status={status} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Kundenstatus</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SELECTABLE_STATUSES.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={status === opt.value}
            onSelect={() => void handleSelect(opt.value as AccountStatusValue)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{opt.label}</span>
              {opt.description ? (
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              ) : null}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!status} onSelect={() => void handleSelect(null)}>
          Status zurücksetzen (CRM-Regeln)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
