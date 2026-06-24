import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { InsightsClient } from '@/app/dashboard/insights/insights-client'
import {
  loadInsightsPageData,
  resolveInsightsScope,
} from '@/app/dashboard/insights/insights-data'
import {
  canUseDevRolePreview,
  DEV_ROLE_COOKIE,
  parseDevRolePreviewCookie,
} from '@/lib/dev-role-preview'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect(ROUTES.onboarding)

  const cookieStore = await cookies()
  const serverRoles = parseProfileRoles(profile)
  const previewRoles = canUseDevRolePreview(serverRoles.systemRole)
    ? parseDevRolePreviewCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
    : null
  const functionRole = previewRoles?.functionRole ?? serverRoles.functionRole
  const systemRole = previewRoles?.systemRole ?? serverRoles.systemRole

  const scope = resolveInsightsScope(functionRole, systemRole, serverRoles.capabilities)
  if (!scope) redirect(ROUTES.home)

  const data = await loadInsightsPageData(supabase, user.id, scope)
  return <InsightsClient data={data} />
}
