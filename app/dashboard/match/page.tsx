import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'

export const dynamic = 'force-dynamic'

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = (params.tab ?? 'smart').toLowerCase()
  const isRfp = tab === 'rfp'

  return (
    <div className="px-6 pt-6 md:px-12 lg:px-20 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{COPY.pages.match}</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant={isRfp ? 'outline' : 'default'}>
          <Link href="/dashboard/match">Intelligente Suche</Link>
        </Button>
        <Button asChild variant={isRfp ? 'default' : 'outline'}>
          <Link href="/dashboard/match?tab=rfp">RFP-Analyse</Link>
        </Button>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Noch nicht verfügbar</CardTitle>
          <CardDescription>
            Diese Seite ist aktuell ein Platzhalter und wird in einem späteren Epic umgesetzt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/deals">Zu den Deals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/evidence">Zu den Referenzen</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

