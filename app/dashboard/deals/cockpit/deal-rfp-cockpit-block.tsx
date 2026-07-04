import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { loadDealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import { DealRfpEligibilitySection } from './deal-rfp-eligibility-section'
import { DealRfpMetricsRow } from './deal-rfp-metrics-row'
import { DealRfpRecommendationBanner } from './deal-rfp-recommendation-banner'

export async function DealRfpCockpitBlock({
  dealId,
  orgId,
  dealContext,
}: {
  dealId: string
  orgId: string
  dealContext?: {
    industry?: string | null
    volume?: string | null
    title?: string | null
  }
}) {
  const supabase = await createServerSupabaseClient()
  const data = await loadDealRfpCockpitData(supabase, orgId, dealId, dealContext)

  if (!data) {
    return (
      <Card id="ausschreibung" className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{COPY.deals.cockpit.rfpBlockTitle}</CardTitle>
          <CardDescription>{COPY.deals.cockpit.rfpBlockEmpty}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" size="sm" asChild>
            <Link href={ROUTES.matchWithDeal(dealId)}>{COPY.deals.cockpit.rfpAnalyzeCta}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <section id="ausschreibung" className="mb-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{COPY.deals.cockpit.rfpBlockTitle}</h2>
        <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.rfpBlockSubtitle}</p>
      </div>
      <DealRfpRecommendationBanner data={data} />
      <DealRfpMetricsRow data={data} />
      <DealRfpEligibilitySection data={data} />
      <p className="text-xs text-muted-foreground">{COPY.deals.cockpit.rfpBlockPhaseHint}</p>
    </section>
  )
}
