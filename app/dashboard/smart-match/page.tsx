import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getDealWithReferences } from '@/app/dashboard/deals/actions'
import { MatchSmartClient } from './match-smart-client'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { MatchRfpClient } from './match-rfp-client'

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

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) redirect(ROUTES.onboarding)

  let initialDeal = null
  if (dealParam) {
    initialDeal = await getDealWithReferences(dealParam)
    if (!initialDeal) redirect(ROUTES.deals.root)
  }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>{COPY.pages.match}</h1>

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
        initialDeal ? (
          <MatchRfpClient
            deal={initialDeal}
            companies={(companies ?? []) as Array<{ id: string; name: string }>}
          />
        ) : (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>RFP-Analyse</CardTitle>
              <CardDescription>
                Für die RFP-Analyse wird ein Deal-Kontext benötigt. Öffne einen Deal und starte die
                RFP-Analyse von dort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={ROUTES.deals.root}>Zu den Deals</Link>
                </Button>
                <Button asChild>
                  <Link href={ROUTES.match}>Zurück zur Suche</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <MatchSmartClient initialDeal={initialDeal} />
      )}
    </div>
  )
}
