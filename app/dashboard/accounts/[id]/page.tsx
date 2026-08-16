import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect, notFound } from 'next/navigation'
import { accountDetailLoads } from '@/lib/accounts/account-detail-surfaces'
import { AccountDetailClient } from '../account-detail-client'
import { getReferencesByCompanyId, getActiveDealsByCompanyId } from '../actions'
import { getNdaAgreementsByCompanyId } from '../nda-actions'
import { getHubSpotPortalIdForOrganization } from '@/lib/crm/connections'

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const initialEditOpen = sp.edit === '1' || sp.edit === 'true'
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)

  const orgId = profile.organization_id as string | null | undefined

  const { data: company } = await supabase
    .from('companies')
    .select(
      'id, name, entity_kind, logo_url, website_url, headquarters, industry, description, employee_count, account_status',
    )
    .eq('id', id)
    .single()

  if (!company) notFound()

  const closedCareLoads = (
    [
      'strategy',
      'stakeholders',
      'internalContacts',
      'externalContacts',
      'marketSignals',
    ] as const
  ).filter((key) => accountDetailLoads(key))
  if (closedCareLoads.length > 0) {
    throw new Error(
      `Account detail still loads care surfaces: ${closedCareLoads.join(', ')}`,
    )
  }

  const [references, activeDeals, ndaResult, hubspotPortalId] = await Promise.all([
    accountDetailLoads('references')
      ? getReferencesByCompanyId(id)
      : Promise.resolve([]),
    accountDetailLoads('deals') ? getActiveDealsByCompanyId(id) : Promise.resolve([]),
    accountDetailLoads('nda')
      ? getNdaAgreementsByCompanyId(id)
      : Promise.resolve({ success: true as const, rows: [] }),
    orgId ? getHubSpotPortalIdForOrganization(supabase, orgId) : Promise.resolve(null),
  ])

  const ndaAgreements = ndaResult.success ? ndaResult.rows : []

  return (
    <div className="px-6 py-6 md:px-10 lg:px-16 xl:px-24">
      <div className="mx-auto w-full max-w-6xl">
        <AccountDetailClient
          company={{
            ...company,
            entity_kind: company.entity_kind === 'partner' ? 'partner' : 'account',
          }}
          references={references}
          activeDeals={activeDeals}
          hubspotPortalId={hubspotPortalId}
          initialEditOpen={initialEditOpen}
          ndaAgreements={ndaAgreements}
        />
      </div>
    </div>
  )
}
