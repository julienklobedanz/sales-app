import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { getDeals } from './actions'
import { DealsClientContent } from './deals-client'
import { getOrganizationCrmConnectionPublicStatus } from '@/lib/crm/connections'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'

export const dynamic = 'force-dynamic'

export default async function DealsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) redirect(ROUTES.onboarding)

  const { systemRole } = parseProfileRoles(profile)
  const isAdmin = isSystemAdmin(systemRole)
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
