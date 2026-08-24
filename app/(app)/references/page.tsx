import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getLibraryDataImpl } from '@/lib/references/library/library-data'
import { DashboardOverview } from '@/app/(app)/dashboard-overview'
import { ReferencePageSkeleton } from '@/components/dashboard/reference-page-skeleton'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { getReferenceVisibilityScope } from '@/lib/roles/reference-visibility-scope'
import { parseRolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { filterReferencesForSales } from '@/lib/references/sales-reference-visibility'
import { getCachedOrgCompanies } from '@/lib/cache/cached-org-reads'

export const dynamic = 'force-dynamic'

export default async function ReferencesHubPage() {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const effective = await getRequestEffectiveRoles()
  if (!effective?.profile.organization_id) redirect(ROUTES.onboarding)

  const {
    profile,
    systemRole: effectiveSystemRole,
    functionRole: effectiveFunctionRole,
    capabilities,
  } = effective

  const orgId = profile.organization_id as string
  const auth = { orgId, userId: user.id }
  const supabase = await createServerSupabaseClient()

  const [
    { data: orgRow },
    dashboard,
    companies,
    contactsResult,
    externalContactsResult,
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('api_settings, date_display_format')
      .eq('id', orgId)
      .maybeSingle(),
    getLibraryDataImpl(false, auth),
    getCachedOrgCompanies(orgId),
    supabase
      .from('contact_persons')
      .select('id, first_name, last_name, email')
      .order('last_name'),
    supabase
      .from('external_contacts')
      .select('id, company_id, first_name, last_name, email, role')
      .eq('organization_id', orgId)
      .order('last_name'),
  ])

  const orgRolesPermissions =
    orgRow?.api_settings && typeof orgRow.api_settings === 'object'
      ? parseRolesPermissionsSettings(
          (orgRow.api_settings as Record<string, unknown>).roles_permissions,
        )
      : null

  const visibilityScope = getReferenceVisibilityScope({
    systemRole: effectiveSystemRole,
    functionRole: effectiveFunctionRole,
    capabilityOverrides: capabilities,
    orgRolesPermissions,
  })

  const references = visibilityScope.restrictToSalesVisibleStatuses
    ? filterReferencesForSales(dashboard.references)
    : dashboard.references

  const orgDateDisplayFormat = normalizeOrgDateDisplayFormat(orgRow?.date_display_format)

  return (
    <Suspense fallback={<ReferencePageSkeleton />}>
      <DashboardOverview
        references={references}
        totalCount={dashboard.totalCount}
        deletedCount={dashboard.deletedCount}
        profile={{
          full_name: profile.full_name,
          systemRole: effectiveSystemRole,
          functionRole: effectiveFunctionRole,
          capabilities,
        }}
        companies={companies}
        contacts={contactsResult.data ?? []}
        externalContacts={externalContactsResult.data ?? []}
        orgDateDisplayFormat={orgDateDisplayFormat}
      />
    </Suspense>
  )
}
