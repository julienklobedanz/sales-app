import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { ROUTES } from '@/lib/routes'
import { DashboardHome } from '@/components/dashboard/dashboard-home'
import type { RoleHomeDashboardPayload } from '@/components/dashboard/role-home-dashboard'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { loadDashboardHomeForFunctionRole } from '@/app/dashboard/dashboard-home-data'
import {
  DEV_ROLE_COOKIE,
  isDevRolePreviewEnabled,
  parseDevRolePreviewCookie,
} from '@/lib/dev-role-preview'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name, system_role, function_role, capabilities')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    redirect(ROUTES.onboarding)
  }

  const cookieStore = await cookies()
  const serverRoles = parseProfileRoles(profile)
  const previewRoles = isDevRolePreviewEnabled()
    ? parseDevRolePreviewCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
    : null
  const functionRole = previewRoles?.functionRole ?? serverRoles.functionRole
  const systemRole = previewRoles?.systemRole ?? serverRoles.systemRole

  const dashboardPayload: RoleHomeDashboardPayload = await loadDashboardHomeForFunctionRole(
    functionRole,
    systemRole,
    supabase,
    user.id,
    profile.full_name as string | null
  )

  const orgId = profile.organization_id

  const [
    accountsRes,
    referencesRes,
    membersRes,
    invitesRes,
    favoriteAccountsRes,
    orgCompanyIdsRes,
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
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase
      .from('organization_invites')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gt('expires_at', new Date().toISOString()),
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_favorite', true),
    supabase.from('companies').select('id').eq('organization_id', orgId),
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
        .select('id', { count: 'exact', head: true })
        .in('company_id', companyIds),
      supabase
        .from('market_signal_executive_events')
        .select('id', { count: 'exact', head: true })
        .in('company_id', companyIds),
    ])
    signalCount = (newsRes.count ?? 0) + (execRes.count ?? 0)
  }

  const isBrandNew = accountCount === 0 && referenceCount === 0

  return (
    <Suspense fallback={<div className="mx-auto mt-12 h-64 max-w-xl animate-pulse rounded-2xl bg-muted/40" />}>
      <DashboardHome
        greetingName={profile.full_name as string | null}
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
      />
    </Suspense>
  )
}
