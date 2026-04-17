import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'
import type { AppRole } from '@/hooks/useRole'
import {
  DEV_ROLE_COOKIE,
  isDevRolePreviewEnabled,
  parseAppRoleCookie,
} from '@/lib/dev-role-preview'
import { loadDashboardHomeForRole } from '@/app/dashboard/dashboard-home-data'
import { SalesRepDashboard } from '@/components/dashboard/sales-rep-dashboard'
import { AccountManagerDashboard } from '@/components/dashboard/account-manager-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
    .select('organization_id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    redirect(ROUTES.onboarding)
  }

  const devSwitcher = isDevRolePreviewEnabled()
  const cookieStore = await cookies()
  const previewRole = devSwitcher ? parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value) : null
  const serverRole = profile.role as AppRole
  const effectiveRole: AppRole = previewRole ?? serverRole

  const home = await loadDashboardHomeForRole(effectiveRole, supabase, user.id, profile.full_name as string | null)

  if (home.role === 'sales') {
    return <SalesRepDashboard data={home.data} />
  }
  if (home.role === 'account_manager') {
    return <AccountManagerDashboard data={home.data} />
  }
  return <AdminDashboard data={home.data} />
}
