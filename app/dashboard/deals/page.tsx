import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getDeals, getMatchingReferencesForDeals } from './actions'
import { DealsClientContent } from './deals-client'

export const dynamic = 'force-dynamic'

export default async function DealsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect(ROUTES.onboarding)

  const deals = await getDeals()

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
    getMatchingReferencesForDeals(deals.map((d) => d.id)),
  ])

  const companies = companiesResult.data
  const orgProfiles = orgProfilesResult.data

  return (
    <div className="flex flex-col space-y-6">
      <DealsClientContent
        deals={deals}
        matchMap={matchMap}
        companies={companies ?? []}
        orgProfiles={orgProfiles ?? []}
      />
    </div>
  )
}
