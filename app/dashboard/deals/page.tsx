import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDeals, getExpiringDeals, getReferencesForOrg } from './actions'
import { DealsClientContent } from './deals-client'

type Props = { searchParams: Promise<{ open?: string }> }

export default async function DealsPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const [deals, expiring, allReferences] = await Promise.all([
    getDeals(),
    getExpiringDeals(),
    getReferencesForOrg(),
  ])

  return (
    <div className="flex flex-col gap-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Deals</h2>
        <p className="text-muted-foreground mt-1">
          Aktuelle Deals und auslaufende Deals – Bedarfe einsehen und Referenzen verknüpfen.
        </p>
      </div>

      <DealsClientContent
        deals={deals}
        expiring={expiring}
        allReferences={allReferences}
        initialOpenDealId={params.open ?? null}
      />
    </div>
  )
}
