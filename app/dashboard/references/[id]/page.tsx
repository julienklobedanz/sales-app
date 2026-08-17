import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { notFound, redirect } from 'next/navigation'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { parseRolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import {
  isReferenceStatusAccessibleToUser,
  resolveReferenceVisibilityScope,
} from '@/lib/roles/reference-access'
import { referencesReadHref } from '@/lib/references/references-list-view'

export const dynamic = 'force-dynamic'

export default async function ReferenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const qs = await searchParams

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
  if (!profile) redirect(ROUTES.onboarding)

  const parsedRoles = parseProfileRoles(profile)
  const organizationId = profile.organization_id ?? null

  let orgRolesPermissions = null
  if (organizationId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('api_settings')
      .eq('id', organizationId)
      .maybeSingle()
    if (orgRow?.api_settings && typeof orgRow.api_settings === 'object') {
      orgRolesPermissions = parseRolesPermissionsSettings(
        (orgRow.api_settings as Record<string, unknown>).roles_permissions,
      )
    }
  }

  const { data: row, error } = await supabase
    .from('references')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (error || !row) notFound()

  const visibilityScope = resolveReferenceVisibilityScope({
    systemRole: parsedRoles.systemRole,
    functionRole: parsedRoles.functionRole,
    capabilityOverrides: parsedRoles.capabilities,
    orgRolesPermissions,
  })
  if (!isReferenceStatusAccessibleToUser(String(row.status ?? '').toLowerCase(), visibilityScope)) {
    notFound()
  }

  const extra: Record<string, string> = {}
  const startApproval = qs.startApproval
  const startValue = Array.isArray(startApproval) ? startApproval[0] : startApproval
  if (startValue === '1' || startValue === 'true') extra.startApproval = '1'
  redirect(referencesReadHref(id, extra))
}
