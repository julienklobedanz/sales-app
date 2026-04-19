'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Briefcase, Shield, UserIcon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { AppRole } from '@/hooks/useRole'
import { clearDevPreviewRole, setDevPreviewRole } from '@/app/dashboard/dev-preview-role-actions'
import { cn } from '@/lib/utils'

function roleLabel(role: AppRole): string {
  switch (role) {
    case 'admin':
      return COPY.devRolePreview.roleMarketingAdmin
    case 'account_manager':
      return COPY.devRolePreview.roleAccountManager
    case 'sales':
      return COPY.devRolePreview.roleSalesRep
    default:
      return role
  }
}

export function SettingsDevRoleCard({
  serverRole,
  previewRole,
}: {
  serverRole: AppRole
  previewRole: AppRole | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const effective: AppRole = previewRole ?? serverRole

  function apply(role: AppRole) {
    start(async () => {
      const res = await setDevPreviewRole(role)
      if (!res.ok) {
        toast.error(res.error ?? 'Rolle konnte nicht gesetzt werden.')
        return
      }
      toast.success(COPY.devRolePreview.switchSuccess)
      router.refresh()
    })
  }

  function clear() {
    start(async () => {
      await clearDevPreviewRole()
      toast.success(COPY.devRolePreview.switchSuccess)
      router.refresh()
    })
  }

  const roles: AppRole[] = ['admin', 'account_manager', 'sales']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{COPY.settings.devRoleCardTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{COPY.settings.devRoleCardDescription}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="text-muted-foreground">{COPY.settings.devRoleStoredLabel}</dt>
          <dd className="mt-1 font-medium">{roleLabel(serverRole)}</dd>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="text-muted-foreground">{COPY.settings.devRoleEffectiveLabel}</dt>
          <dd className="mt-1 font-medium">{roleLabel(effective)}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <p className="text-sm font-medium">Vorschau setzen</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {roles.map((role) => {
            const active = effective === role
            const icon =
              role === 'admin' ? (
                <AppIcon icon={Shield} size={16} className="shrink-0" />
              ) : role === 'account_manager' ? (
                <AppIcon icon={UserIcon} size={16} className="shrink-0" />
              ) : (
                <AppIcon icon={Briefcase} size={16} className="shrink-0" />
              )
            return (
              <Button
                key={role}
                type="button"
                variant={active ? 'default' : 'outline'}
                className={cn('justify-start gap-2', active && 'ring-2 ring-ring ring-offset-2')}
                disabled={pending}
                onClick={() => apply(role)}
              >
                {icon}
                {roleLabel(role)}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="button" variant="secondary" disabled={pending || !previewRole} onClick={clear}>
          {COPY.settings.devRoleClear}
        </Button>
      </div>
    </div>
  )
}
