'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import {
  DEV_ROLE_PRESETS,
  devRolePreviewKey,
  formatDevRolePreviewLabel,
  type DevRolePreview,
} from '@/lib/dev-role-preview'
import {
  clearDevPreviewRole,
  setDevPreviewRole,
} from '@/app/dashboard/dev-preview-role-actions'
import { cn } from '@/lib/utils'

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
      if (!res.success) {
        toast.error(res.error ?? 'Rolle konnte nicht gesetzt werden.')
        return
      }
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
  }

  function clear() {
    start(async () => {
      const res = await clearDevPreviewRole()
      if (!res.success) {
        toast.error(res.error ?? 'Anzeige konnte nicht zurückgesetzt werden.')
        return
      }
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle as="h3" className="text-lg font-semibold tracking-tight">
          {COPY.settings.roleSwitcherCardTitle}
        </CardTitle>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Card className="px-3 py-2">
          <dt className="text-muted-foreground">
            {COPY.settings.roleSwitcherStoredLabel}
          </dt>
          <CardTitle as="h3" className="mt-1 text-sm font-medium">
            {formatDevRolePreviewLabel(serverRoles)}
          </CardTitle>
        </Card>
        <Card className="px-3 py-2">
          <dt className="text-muted-foreground">
            {COPY.settings.roleSwitcherActiveLabel}
          </dt>
          <CardTitle as="h3" className="mt-1 text-sm font-medium">
            {formatDevRolePreviewLabel(effective)}
          </CardTitle>
        </Card>
      </dl>

      <div className="space-y-2">
        <p className="text-sm font-medium">{COPY.settings.roleSwitcherPickLabel}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {DEV_ROLE_PRESETS.map((preset) => {
            const active = devRolePreviewKey(effective) === devRolePreviewKey(preset)
            return (
              <Button
                key={devRolePreviewKey(preset)}
                type="button"
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'justify-start gap-2',
                  active && 'ring-2 ring-ring ring-offset-2',
                )}
                disabled={pending}
                onClick={() => apply(preset)}
              >
                {formatDevRolePreviewLabel(preset)}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !previewRoles}
          onClick={clear}
        >
          {COPY.settings.roleSwitcherReset}
        </Button>
      </div>
    </div>
  )
}
