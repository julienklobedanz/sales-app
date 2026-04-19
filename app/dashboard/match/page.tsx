import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { getDealWithReferences } from '@/app/dashboard/deals/actions'
import { MatchSmartClient } from './match-smart-client'

export const dynamic = 'force-dynamic'

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; deal?: string }>
}) {
  const params = await searchParams
  const tab = (params.tab ?? 'smart').toLowerCase()
  const isRfp = tab === 'rfp'
  const dealParam = params.deal?.trim()

  let initialDeal = null
  if (dealParam) {
    initialDeal = await getDealWithReferences(dealParam)
    if (!initialDeal) redirect(ROUTES.deals.root)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{COPY.pages.match}</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant={isRfp ? 'outline' : 'default'}>
          <Link href={dealParam ? `${ROUTES.match}?deal=${encodeURIComponent(dealParam)}` : ROUTES.match}>
            Intelligente Suche
          </Link>
        </Button>
        <Button asChild variant={isRfp ? 'default' : 'outline'}>
          <Link
            href={
              dealParam
                ? `${ROUTES.match}?tab=rfp&deal=${encodeURIComponent(dealParam)}`
                : `${ROUTES.match}?tab=rfp`
            }
          >
            RFP-Analyse
          </Link>
        </Button>
      </div>

      {isRfp ? (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Noch nicht verfügbar</CardTitle>
            <CardDescription>
              RFP-Analyse ist aktuell ein Platzhalter und wird in einem späteren Epic umgesetzt.
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
      ) : (
        <MatchSmartClient initialDeal={initialDeal} />
      )}
    </div>
  )
}
