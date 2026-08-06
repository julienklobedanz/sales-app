import Link from 'next/link'

import { ROUTES } from '@/lib/routes'

export function WatchlistManageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Marktsignale verwalten
        </h1>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <Link
          href={ROUTES.marketSignals}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Zurück zu Marktsignalen
        </Link>
        <Link
          href={ROUTES.settings}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Einstellungen
        </Link>
      </div>
    </div>
  )
}
