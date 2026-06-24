import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getDashboardDataImpl } from '@/lib/evidence/dashboard'
import { DashboardOverview } from '@/app/dashboard/dashboard-overview'
import { EvidencePageSkeleton } from '@/components/dashboard/evidence-page-skeleton'
import { enrichReferencedCompaniesMissingBrandfetch } from '@/lib/evidence/sync-company-brandfetch'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { listComplianceDocuments } from '@/app/dashboard/settings/compliance-actions'
import { getReferenceVisibilityScope } from '@/lib/roles/reference-visibility-scope'
import { parseRolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { filterReferencesForSales } from '@/lib/references/sales-reference-visibility'
import { getCachedOrgCompanies } from '@/lib/cache/cached-org-reads'

export const dynamic = 'force-dynamic'

export default async function EvidenceHubPage() {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const effective = await getRequestEffectiveRoles()
  if (!effective?.profile.organization_id) redirect(ROUTES.onboarding)

  const {
    profile,
    effectiveRole,
    systemRole: effectiveSystemRole,
    functionRole: effectiveFunctionRole,
    capabilities,
  } = effective

  const orgId = profile.organization_id as string
  const auth = { orgId, userId: user.id }

  const supabase = await createServerSupabaseClient()

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('api_settings')
    .eq('id', orgId)
    .maybeSingle()

  const orgRolesPermissions =
    orgRow?.api_settings && typeof orgRow.api_settings === 'object'
      ? parseRolesPermissionsSettings(
          (orgRow.api_settings as Record<string, unknown>).roles_permissions
        )
      : null

  const visibilityScope = getReferenceVisibilityScope({
    systemRole: effectiveSystemRole,
    functionRole: effectiveFunctionRole,
    capabilityOverrides: capabilities,
    orgRolesPermissions,
  })

  const dashboard = await getDashboardDataImpl(false, auth)

  let references = visibilityScope.restrictToSalesVisibleStatuses
    ? filterReferencesForSales(dashboard.references)
    : dashboard.references

  const companyIdsNeedingEnrich = [
    ...new Set(
      references
        .filter(
          (r) =>
            r.company_id &&
            (!String(r.company_logo_url ?? '').trim() || !String(r.industry ?? '').trim())
        )
        .map((r) => r.company_id as string)
    ),
  ]
  if (companyIdsNeedingEnrich.length > 0) {
    await enrichReferencedCompaniesMissingBrandfetch(companyIdsNeedingEnrich)
    const refreshed = await getDashboardDataImpl(false, auth)
    references = visibilityScope.restrictToSalesVisibleStatuses
      ? filterReferencesForSales(refreshed.references)
      : refreshed.references
  }

  const [companies, contactsResult, externalContactsResult, orgFmtResult] = await Promise.all([
    getCachedOrgCompanies(orgId),
    supabase.from('contact_persons').select('*').order('last_name'),
    supabase
      .from('external_contacts')
      .select('id, company_id, first_name, last_name, email, role')
      .eq('organization_id', orgId)
      .order('last_name'),
    supabase.from('organizations').select('date_display_format').eq('id', orgId).maybeSingle(),
  ])

  const orgDateDisplayFormat = normalizeOrgDateDisplayFormat(
    (orgFmtResult.data as { date_display_format?: string | null } | null)?.date_display_format
  )

  const complianceListed = await listComplianceDocuments()
  const complianceDocuments = complianceListed.success ? complianceListed.rows : []

  return (
    <Suspense fallback={<EvidencePageSkeleton />}>
      <DashboardOverview
        references={references}
        totalCount={dashboard.totalCount}
        deletedCount={dashboard.deletedCount}
        profile={{
          full_name: profile.full_name,
          role: effectiveRole,
          systemRole: effectiveSystemRole,
          functionRole: effectiveFunctionRole,
          capabilities,
        }}
        companies={companies}
        contacts={contactsResult.data ?? []}
        externalContacts={externalContactsResult.data ?? []}
        orgDateDisplayFormat={orgDateDisplayFormat}
        complianceDocuments={complianceDocuments}
      />
    </Suspense>
  )
}
