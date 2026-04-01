'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { toast } from 'sonner'

export function SettingsDangerZone() {
  function handleDeleteAccount() {
    if (
      !confirm(
        'Wirklich den Account und alle Daten dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      )
    ) {
      return
    }
    // Kontolöschung erfordert serverseitige Auth-/Datenbereinigung; bis dahin klar kommunizieren.
    toast.info(COPY.settings.accountDeletionDisabledToast)
  }

  return (
    <div className="rounded-3xl border-2 border-destructive/30 bg-destructive/5 p-6">
      <p className="text-sm font-semibold text-destructive">
        Diese Aktionen sind permanent und können nicht rückgängig gemacht werden.
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        {COPY.settings.accountDeletionNotAvailableHint}
      </p>
      <div className="mt-4">
        <Button type="button" variant="destructive" size="sm" onClick={handleDeleteAccount}>
          <AppIcon icon={Trash2} size={16} className="mr-2" />
          Account löschen
        </Button>
      </div>
    </div>
  )
}
