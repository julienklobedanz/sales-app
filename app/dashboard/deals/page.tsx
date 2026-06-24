import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { getDeals } from './actions'
import { DealsClientContent } from './deals-client'
import { DealsPageSkeleton } from '@/components/dashboard/deals-page-skeleton'
import { getOrganizationCrmConnectionPublicStatus } from '@/lib/crm/connections'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
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
  const isAdmin = isSystemAdmin(effective.systemRole)
  const hubspotConfigured = isHubSpotConfigured()
  const hubspotStatus =
    isAdmin
      ? await getOrganizationCrmConnectionPublicStatus(supabase, orgId, 'hubspot')
      : { connected: false, externalAccountId: null, lastSyncAt: null }

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

  const showTitle = deals.length > 0

  return (
    <div className="space-y-6">
      {showTitle ? <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Deals</h1> : null}
      <DealsClientContent
        deals={deals}
        companies={(companiesRes.data ?? []) as { id: string; name: string }[]}
        orgProfiles={(orgProfilesRes.data ?? []) as { id: string; full_name: string | null }[]}
        hubspotConfigured={hubspotConfigured}
        hubspotConnected={hubspotStatus.connected}
        canConnectCrm={isAdmin && hubspotConfigured}
      />
    </div>
  )
}
