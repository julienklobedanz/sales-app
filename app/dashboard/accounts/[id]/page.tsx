import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect, notFound } from 'next/navigation'
import { AccountDetailClient } from '../account-detail-client'
import {
  getCompanyStrategy,
  getStakeholders,
  getContactsByCompanyId,
  type ExternalContactRow,
  getReferencesByCompanyId,
  getActiveDealsByCompanyId,
} from '../actions'
import { getNdaAgreementsByCompanyId } from '../nda-actions'
import { fetchExternalContactsForCompany } from '@/lib/accounts/external-contacts-fetch'
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

  const profileOrgId = profile.organization_id

  const orgId = profile.organization_id as string | null | undefined
  let organizationName: string | null = null
  if (orgId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    organizationName = (orgRow as { name?: string } | null)?.name?.trim() || null
  }

  const { data: company } = await supabase
    .from('companies')
    .select(
      'id, name, entity_kind, logo_url, website_url, headquarters, industry, description, employee_count, account_status, internal_reference_approval_contact_id',
    )
    .eq('id', id)
    .single()

  if (!company) notFound()

  async function getExternalContactsSafe() {
    if (!profileOrgId) return []
    return fetchExternalContactsForCompany(supabase, id, profileOrgId)
  }

  const [
    strategy,
    stakeholders,
    internalContacts,
    references,
    activeDeals,
    externalContactsResult,
    ndaResult,
    hubspotPortalId,
  ] = await Promise.all([
    getCompanyStrategy(id),
    getStakeholders(id),
    getContactsByCompanyId(id),
    getReferencesByCompanyId(id),
    getActiveDealsByCompanyId(id),
    getExternalContactsSafe(),
    getNdaAgreementsByCompanyId(id),
    orgId ? getHubSpotPortalIdForOrganization(supabase, orgId) : Promise.resolve(null),
  ])

  const ndaAgreements = ndaResult.success ? ndaResult.rows : []

  const [executiveEventsResult, accountNewsResult] = await Promise.all([
    supabase
      .from('market_signal_executive_events')
      .select(
        'id, person_name, person_title_before, person_title_after, change_summary, detected_at, event_kind, source_url',
      )
      .eq('company_id', id)
      .order('detected_at', { ascending: false })
      .limit(40),
    supabase
      .from('market_signal_account_news')
      .select('id, body, source_label, source_url, published_on, segment')
      .eq('company_id', id)
      .order('published_on', { ascending: false })
      .limit(40),
  ])

  const marketSignals = {
    championMoves: (executiveEventsResult.data ?? []).map((row) => {
      const ek = String((row as { event_kind?: string }).event_kind ?? 'role_change')
      return {
        id: String(row.id),
        personName: String(row.person_name ?? ''),
        personTitleBefore: (row.person_title_before as string | null) ?? null,
        personTitleAfter: (row.person_title_after as string | null) ?? null,
        changeSummary: String(row.change_summary ?? ''),
        detectedAt: String(row.detected_at ?? ''),
        eventKind:
          ek === 'news_mention' ? ('news_mention' as const) : ('role_change' as const),
        sourceUrl:
          ((row as { source_url?: string | null }).source_url as string | null) ?? null,
      }
    }),
    accountNews: (accountNewsResult.data ?? []).map((row) => {
      const seg = String(row.segment ?? 'customer')
      const segment: 'customer' | 'prospect' =
        seg === 'prospect' ? 'prospect' : 'customer'
      return {
        id: String(row.id),
        body: String(row.body ?? ''),
        sourceLabel: (row.source_label as string | null) ?? null,
        sourceUrl: (row.source_url as string | null) ?? null,
        publishedOn: String(row.published_on ?? ''),
        segment,
      }
    }),
  }

  return (
    <div className="px-6 py-6 md:px-10 lg:px-16 xl:px-24">
      <div className="w-full max-w-6xl mx-auto">
        <AccountDetailClient
          company={{
            ...company,
            entity_kind:
              (company as { entity_kind?: string }).entity_kind === 'partner'
                ? 'partner'
                : 'account',
          }}
          organizationName={organizationName}
          strategy={strategy}
          stakeholders={stakeholders}
          internalContacts={internalContacts}
          externalContacts={(externalContactsResult ?? []) as ExternalContactRow[]}
          references={references}
          activeDeals={activeDeals}
          hubspotPortalId={hubspotPortalId}
          marketSignals={marketSignals}
          initialEditOpen={initialEditOpen}
          ndaAgreements={ndaAgreements}
        />
      </div>
    </div>
  )
}
