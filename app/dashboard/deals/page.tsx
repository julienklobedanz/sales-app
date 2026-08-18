import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { getDeals } from './actions'
import { DealsClientContent } from './deals-client'
import { DealsPageSkeleton } from '@/components/dashboard/deals-page-skeleton'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'

export const dynamic = 'force-dynamic'

export default function DealsPage() {
  return (
    <Suspense fallback={<DealsPageSkeleton />}>
      <DealsPageContent />
    </Suspense>
  )
}

async function DealsPageContent() {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const effective = await getRequestEffectiveRoles()
  const orgId = effective?.profile.organization_id
  if (!orgId) redirect(ROUTES.onboarding)

  const supabase = await createServerSupabaseClient()

  const [deals, companiesRes, orgProfilesRes] = await Promise.all([
    getDeals(),
    supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .order('full_name', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <DealsClientContent
        deals={deals}
        companies={companiesRes.data ?? []}
        orgProfiles={orgProfilesRes.data ?? []}
      />
    </div>
  )
}
