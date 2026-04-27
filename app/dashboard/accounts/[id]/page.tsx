import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect, notFound } from 'next/navigation'
import { CompanyDetailClient } from '../company-detail-client'
import {
  getCompanyStrategy,
  getStakeholders,
  getContactsByCompanyId,
  type ExternalContactRow,
  getReferencesByCompanyId,
  getActiveDealsByCompanyId,
} from '../actions'

export default async function CompanyDetailPage({
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

  const { data: company } = await supabase
    .from('companies')
    .select(
      'id, name, logo_url, website_url, headquarters, industry, description, employee_count, account_status'
    )
    .eq('id', id)
    .single()

  if (!company) notFound()

  const [strategy, stakeholders, internalContacts, references, activeDeals, externalContactsResult] = await Promise.all([
    getCompanyStrategy(id),
    getStakeholders(id),
    getContactsByCompanyId(id),
    getReferencesByCompanyId(id),
    getActiveDealsByCompanyId(id),
    supabase
      .from('external_contacts')
      .select('id, company_id, first_name, last_name, email, role, phone, created_at, updated_at')
      .eq('company_id', id)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true }),
  ])

  const [executiveEventsResult, accountNewsResult] = await Promise.all([
    supabase
      .from('market_signal_executive_events')
      .select('id, person_name, person_title_before, person_title_after, change_summary, detected_at')
      .eq('company_id', id)
      .order('detected_at', { ascending: false })
      .limit(40),
    supabase
      .from('market_signal_account_news')
      .select('id, body, source_label, published_on, segment')
      .eq('company_id', id)
      .order('published_on', { ascending: false })
      .limit(40),
  ])

  const marketSignals = {
    championMoves: (executiveEventsResult.data ?? []).map((row) => ({
      id: String(row.id),
      personName: String(row.person_name ?? ''),
      personTitleBefore: (row.person_title_before as string | null) ?? null,
      personTitleAfter: (row.person_title_after as string | null) ?? null,
      changeSummary: String(row.change_summary ?? ''),
      detectedAt: String(row.detected_at ?? ''),
    })),
    accountNews: (accountNewsResult.data ?? []).map((row) => {
      const seg = String(row.segment ?? 'customer')
      const segment: 'customer' | 'prospect' = seg === 'prospect' ? 'prospect' : 'customer'
      return {
        id: String(row.id),
        body: String(row.body ?? ''),
        sourceLabel: (row.source_label as string | null) ?? null,
        publishedOn: String(row.published_on ?? ''),
        segment,
      }
    }),
  }

  return (
    <div className="px-6 py-6 md:px-10 lg:px-16 xl:px-24">
      <div className="w-full max-w-6xl mx-auto">
        <CompanyDetailClient
          company={company}
          strategy={strategy}
          stakeholders={stakeholders}
          internalContacts={internalContacts}
          externalContacts={(externalContactsResult.data ?? []) as ExternalContactRow[]}
          references={references}
          activeDeals={activeDeals}
          marketSignals={marketSignals}
          initialEditOpen={initialEditOpen}
        />
      </div>
    </div>
  )
}
