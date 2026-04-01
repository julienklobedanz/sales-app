export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export default function MarketSignalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{COPY.pages.marketSignals}</h1>
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Noch nicht verfügbar</CardTitle>
          <CardDescription>
            Diese Seite wird im Wireframe referenziert und wird in einem späteren Epic umgesetzt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={ROUTES.deals.root}>Zu den Deals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.evidence.root}>Zu den Referenzen</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

