import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getDashboardData, getPendingClientApprovals } from '@/app/dashboard/actions'
import { DashboardOverview } from '@/app/dashboard/dashboard-overview'
import { DEV_ROLE_COOKIE, parseAppRoleCookie } from '@/lib/dev-role-preview'
import type { AppRole } from '@/hooks/useRole'

export const dynamic = 'force-dynamic'

export default async function EvidenceHubPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect(ROUTES.onboarding)

  const cookieStore = await cookies()
  const previewRole = parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
  const serverRole = profile.role as AppRole
  const effectiveRole: AppRole = previewRole ?? serverRole

  const [dashboard, pendingClientApprovals] = await Promise.all([
    getDashboardData(false),
    getPendingClientApprovals(),
  ])

  const references =
    effectiveRole === 'sales'
      ? dashboard.references.filter((r) => r.status === 'approved' || r.status === 'internal_only')
      : dashboard.references

  const orgId = (profile as { organization_id?: string | null }).organization_id ?? ''

  const [companiesResult, contactsResult, externalContactsResult, dealsResult] = await Promise.all([
    supabase.from('companies').select('id, name, logo_url').order('name'),
    supabase.from('contact_persons').select('*').order('last_name'),
    supabase
      .from('external_contacts')
      .select('id, company_id, first_name, last_name, email, role')
      .eq('organization_id', orgId)
      .order('last_name'),
    supabase
      .from('deals')
      .select('id, title')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <DashboardOverview
      references={references}
      totalCount={dashboard.totalCount}
      deletedCount={dashboard.deletedCount}
      profile={{ full_name: profile.full_name, role: effectiveRole }}
      companies={companiesResult.data ?? []}
      contacts={contactsResult.data ?? []}
      externalContacts={externalContactsResult.data ?? []}
      deals={dealsResult.data ?? []}
      pendingClientApprovals={pendingClientApprovals}
    />
  )
}

