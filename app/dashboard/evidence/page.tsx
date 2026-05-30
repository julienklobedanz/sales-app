import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/app/dashboard/actions'
import { DashboardOverview } from '@/app/dashboard/dashboard-overview'
import { enrichReferencedCompaniesMissingBrandfetch } from '@/app/dashboard/references/sync-company-brandfetch'
import { DEV_ROLE_COOKIE, parseAppRoleCookie } from '@/lib/dev-role-preview'
import type { AppRole } from '@/hooks/useRole'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { listComplianceDocuments } from '@/app/dashboard/settings/compliance-actions'

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

  const dashboard = await getDashboardData(false)

  let references =
    effectiveRole === 'sales'
      ? dashboard.references.filter((r) => r.status === 'approved' || r.status === 'internal_only')
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
    references =
      effectiveRole === 'sales'
        ? refreshed.references.filter(
            (r) => r.status === 'approved' || r.status === 'internal_only'
          )
        : refreshed.references
  }

  const orgId = (profile as { organization_id?: string | null }).organization_id ?? ''

  const [companiesResult, contactsResult, externalContactsResult, orgFmtResult] =
    await Promise.all([
    supabase.from('companies').select('id, name, logo_url, industry').order('name'),
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
      profile={{ full_name: profile.full_name, role: effectiveRole }}
      companies={companiesResult.data ?? []}
      contacts={contactsResult.data ?? []}
      externalContacts={externalContactsResult.data ?? []}
      orgDateDisplayFormat={orgDateDisplayFormat}
      complianceDocuments={complianceDocuments}
    />
  )
}

