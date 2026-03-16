'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

export function SettingsDangerZone() {
  const [loading, setLoading] = useState(false)

  function handleDeleteAccount() {
    if (!confirm('Wirklich den Account und alle Daten dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }
    setLoading(true)
    // TODO: Implement actual account deletion (e.g. Supabase auth + profile cleanup)
    setTimeout(() => {
      setLoading(false)
      alert('Account-Löschung ist in dieser Demo nicht implementiert. In Production: Auth-User und zugehörige Daten löschen.')
    }, 500)
  }

  return (
    <div className="rounded-3xl border-2 border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
      <h3 className="text-base font-semibold text-red-800 dark:text-red-200">
        Gefahrenbereich
      </h3>
      <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">
        Diese Aktionen sind permanent und können nicht rückgängig gemacht werden.
      </p>
      <div className="mt-4">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Account löschen
        </Button>
      </div>
    </div>
  )
}
