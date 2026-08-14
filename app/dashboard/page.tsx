import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { DashboardHome } from '@/components/dashboard/dashboard-home'
import { DashboardHomeSkeleton } from '@/components/dashboard/dashboard-home-skeleton'
import type { RoleHomeDashboardPayload } from '@/components/dashboard/role-home-dashboard'
import { loadDashboardHomeForFunctionRole } from '@/app/dashboard/dashboard-home-data'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'
import { isThinDashboardContext } from '@/lib/dashboard-home/thin-data'
import { parseDemoSeed } from '@/lib/onboarding/seed-demo-workspace'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardHomeSkeleton />}>
      <DashboardHomeContent />
    </Suspense>
  )
}

async function DashboardHomeContent() {
  const user = await getRequestUser()
  if (!user) {
    redirect(ROUTES.login)
  }

  const effective = await getRequestEffectiveRoles()
  if (!effective?.profile.organization_id) {
    redirect(ROUTES.onboarding)
  }

  const { profile, functionRole, systemRole } = effective
  const supabase = await createServerSupabaseClient()

  const dashboardPayload: RoleHomeDashboardPayload =
    await loadDashboardHomeForFunctionRole(
      functionRole,
      systemRole,
      supabase,
      user.id,
      profile.full_name,
      profile.organization_id ?? undefined,
    )

  const orgId = profile.organization_id as string
  // Server Component: wall-clock cutoff for the 7d evidence query (not client render purity).
  // eslint-disable-next-line react-hooks/purity -- server-only timestamp for query filter
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    accountsRes,
    referencesRes,
    membersRes,
    invitesRes,
    favoriteAccountsRes,
    orgCompanyIdsRes,
    dealsRes,
    events7dRes,
    orgSettingsRes,
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('entity_kind', 'account'),
    supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null),
    supabase
      .from('profiles')
      .select('id', { count: 'planned', head: true })
      .eq('organization_id', orgId),
    supabase
      .from('organization_invites')
      .select('id', { count: 'planned', head: true })
      .eq('organization_id', orgId)
      .gt('expires_at', new Date().toISOString()),
    supabase
      .from('companies')
      .select('id', { count: 'planned', head: true })
      .eq('organization_id', orgId)
      .eq('is_favorite', true),
    supabase.from('companies').select('id').eq('organization_id', orgId),
    supabase
      .from('deals')
      .select('id', { count: 'planned', head: true })
      .eq('organization_id', orgId)
      .in('status', ['open', 'rfp', 'negotiation']),
    supabase
      .from('evidence_events')
      .select('id', { count: 'planned', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', weekAgoIso),
    supabase
      .from('organizations')
      .select('integration_settings')
      .eq('id', orgId)
      .maybeSingle(),
  ])

  const accountCount = accountsRes.count ?? 0
  const referenceCount = referencesRes.count ?? 0
  const memberCount = membersRes.count ?? 0
  const pendingInviteCount = invitesRes.count ?? 0
  const favoriteAccountCount = favoriteAccountsRes.count ?? 0
  const companyIds = (orgCompanyIdsRes.data ?? []).map((row) => row.id)

  let signalCount = 0
  if (companyIds.length > 0) {
    const [newsRes, execRes] = await Promise.all([
      supabase
        .from('market_signal_account_news')
        .select('id', { count: 'planned', head: true })
        .in('company_id', companyIds),
      supabase
        .from('market_signal_executive_events')
        .select('id', { count: 'planned', head: true })
        .in('company_id', companyIds),
    ])
    signalCount = (newsRes.count ?? 0) + (execRes.count ?? 0)
  }

  const isBrandNew = accountCount === 0 && referenceCount === 0
  const thinDashboard = isThinDashboardContext({
    referenceCount,
    dealCount: dealsRes.count ?? 0,
    eventCount: events7dRes.count ?? 0,
  })

  return (
    <DashboardHome
      greetingName={profile.full_name}
      isBrandNew={isBrandNew}
      userRegisteredAt={user.created_at}
      progress={{
        hasAccounts: accountCount > 0,
        hasReferences: referenceCount > 0,
        hasTeamInvites: memberCount > 1 || pendingInviteCount > 0,
        hasMarketSignals: signalCount > 0 || favoriteAccountCount > 0,
      }}
      dashboardPayload={dashboardPayload}
      functionRole={functionRole}
      thinDashboard={thinDashboard}
      hasDemoSeed={Boolean(parseDemoSeed(orgSettingsRes.data?.integration_settings))}
    />
  )
}
