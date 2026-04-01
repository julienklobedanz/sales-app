'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[dashboard] error boundary:', error)
  }, [error])

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Etwas ist schiefgelaufen</h1>
        <p className="mt-1 text-muted-foreground">
          Bitte versuche es erneut. Wenn das Problem bestehen bleibt, lade die Seite neu.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Button variant="outline" asChild>
          <Link href={ROUTES.home}>Zum Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

