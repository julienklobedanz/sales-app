import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/app/dashboard/actions'
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

export default function EvidenceHubPage() {
  return (
    <Suspense fallback={<EvidencePageSkeleton />}>
      <EvidenceHubContent />
    </Suspense>
  )
}

async function EvidenceHubContent() {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const effective = await getRequestEffectiveRoles()
  if (!effective) redirect(ROUTES.onboarding)

  const {
    profile,
    effectiveRole,
    systemRole: effectiveSystemRole,
    functionRole: effectiveFunctionRole,
    capabilities,
  } = effective

  const supabase = await createServerSupabaseClient()

  const { data: orgRow } = profile.organization_id
    ? await supabase
        .from('organizations')
        .select('api_settings')
        .eq('id', profile.organization_id)
        .maybeSingle()
    : { data: null }

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

  const dashboard = await getDashboardData(false)

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
    const refreshed = await getDashboardData(false)
    references = visibilityScope.restrictToSalesVisibleStatuses
      ? filterReferencesForSales(refreshed.references)
      : refreshed.references
  }

  const orgId = profile.organization_id ?? ''

  const [companies, contactsResult, externalContactsResult, orgFmtResult] = await Promise.all([
    orgId ? getCachedOrgCompanies(orgId) : Promise.resolve([]),
    supabase.from('contact_persons').select('*').order('last_name'),
    supabase
      .from('external_contacts')
      .select('id, company_id, first_name, last_name, email, role')
      .eq('organization_id', orgId)
      .order('last_name'),
    orgId
      ? supabase.from('organizations').select('date_display_format').eq('id', orgId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const orgDateDisplayFormat = normalizeOrgDateDisplayFormat(
    (orgFmtResult.data as { date_display_format?: string | null } | null)?.date_display_format
  )

  const complianceListed = await listComplianceDocuments()
  const complianceDocuments = complianceListed.success ? complianceListed.rows : []

  return (
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
  )
}
