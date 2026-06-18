'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import {
  DEV_ROLE_PRESETS,
  type DevRolePreview,
} from '@/lib/dev-role-preview'
import { clearDevPreviewRole, setDevPreviewRole } from '@/app/dashboard/dev-preview-role-actions'
import { cn } from '@/lib/utils'

function formatPreviewLabel(preview: DevRolePreview): string {
  const system =
    COPY.roleDimensions.systemRoles[preview.systemRole] ?? preview.systemRole
  const fn =
    COPY.roleDimensions.functionRoles[preview.functionRole] ?? preview.functionRole
  return `${system} · ${fn}`
}

function previewKey(preview: DevRolePreview): string {
  return `${preview.systemRole}:${preview.functionRole}`
}

export function SettingsDevRoleCard({
  serverRoles,
  previewRoles,
}: {
  serverRoles: DevRolePreview
  previewRoles: DevRolePreview | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const effective = previewRoles ?? serverRoles

  function apply(preview: DevRolePreview) {
    start(async () => {
      const res = await setDevPreviewRole(preview)
      if (!res.ok) {
        toast.error(res.error ?? 'Rolle konnte nicht gesetzt werden.')
        return
      }
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
  }

  function clear() {
    start(async () => {
      await clearDevPreviewRole()
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{COPY.settings.roleSwitcherCardTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{COPY.settings.roleSwitcherCardDescription}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="text-muted-foreground">{COPY.settings.roleSwitcherStoredLabel}</dt>
          <dd className="mt-1 font-medium">{formatPreviewLabel(serverRoles)}</dd>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="text-muted-foreground">{COPY.settings.roleSwitcherActiveLabel}</dt>
          <dd className="mt-1 font-medium">{formatPreviewLabel(effective)}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <p className="text-sm font-medium">{COPY.settings.roleSwitcherPickLabel}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {DEV_ROLE_PRESETS.map((preset) => {
            const active = previewKey(effective) === previewKey(preset)
            return (
              <Button
                key={previewKey(preset)}
                type="button"
                variant={active ? 'default' : 'outline'}
                className={cn('justify-start gap-2', active && 'ring-2 ring-ring ring-offset-2')}
                disabled={pending}
                onClick={() => apply(preset)}
              >
                {formatPreviewLabel(preset)}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="button" variant="secondary" disabled={pending || !previewRoles} onClick={clear}>
          {COPY.settings.roleSwitcherReset}
        </Button>
      </div>
    </div>
  )
}
