import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDeals, getExpiringDeals, getMatchingReferencesForDeals } from './actions'
import { DealsClientContent } from './deals-client'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ open?: string }> }

export default async function DealsPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams

  const [deals, expiring] = await Promise.all([
    getDeals(),
    getExpiringDeals(),
  ])

  const [companiesResult, orgProfilesResult, matchMap] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('name'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', profile.organization_id)
      .order('full_name'),
    getMatchingReferencesForDeals([
      ...deals.map((d) => d.id),
      ...expiring.map((d) => d.id),
    ]),
  ])

  const companies = companiesResult.data
  const orgProfiles = orgProfilesResult.data

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <DealsClientContent
        deals={deals}
        expiring={expiring}
        matchMap={matchMap}
        currentUserId={user.id}
        initialOpenDealId={params.open ?? null}
        companies={companies ?? []}
        orgProfiles={orgProfiles ?? []}
      />
    </div>
  )
}
