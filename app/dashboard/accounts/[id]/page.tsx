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

  async function getExternalContactsSafe() {
    const orgId = profile.organization_id
    if (!orgId) return []
    try {
      const { data, error } = await supabase
        .from('external_contacts')
        .select('id, company_id, first_name, last_name, email, role, phone, last_interaction_at, created_at, updated_at')
        .eq('company_id', id)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const disableLastInteraction = msg.toLowerCase().includes('last_interaction_at')
      const disablePhone = msg.toLowerCase().includes('phone') && msg.toLowerCase().includes('column')
      if (!disableLastInteraction && !disablePhone) {
        console.error('[accounts/[id]] external_contacts query failed:', e)
        return []
      }

      // Schema-Cache-Fallback: Wenn (nach Migration) Spalten noch nicht im PostgREST-Cache bekannt sind.
      const selectBase = 'id, company_id, first_name, last_name, email, role'
      const selectPhone = disablePhone ? '' : ', phone'
      const selectLastInteraction = disableLastInteraction ? '' : ', last_interaction_at'
      const select = `${selectBase}${selectPhone}${selectLastInteraction}, created_at, updated_at`

      const { data, error } = await supabase
        .from('external_contacts')
        .select(select)
        .eq('company_id', id)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[accounts/[id]] external_contacts fallback query failed:', error)
        return []
      }

      // Damit unsere TS-Typen konsistent bleiben: fehlende Spalten auf Default mappen.
      const rows = (data ?? []) as unknown as Record<string, unknown>[]
      return rows.map((r) => {
        return {
          ...r,
          phone: disablePhone ? null : ((r.phone as string | null | undefined) ?? null),
          last_interaction_at: disableLastInteraction ? null : ((r.last_interaction_at as string | null | undefined) ?? null),
        }
      })
    }
  }

  const [strategy, stakeholders, internalContacts, references, activeDeals, externalContactsResult] = await Promise.all([
    getCompanyStrategy(id),
    getStakeholders(id),
    getContactsByCompanyId(id),
    getReferencesByCompanyId(id),
    getActiveDealsByCompanyId(id),
    getExternalContactsSafe(),
  ])

  const [executiveEventsResult, accountNewsResult] = await Promise.all([
    supabase
      .from('market_signal_executive_events')
      .select(
        'id, person_name, person_title_before, person_title_after, change_summary, detected_at, event_kind, source_url'
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
        eventKind: ek === 'news_mention' ? ('news_mention' as const) : ('role_change' as const),
        sourceUrl: ((row as { source_url?: string | null }).source_url as string | null) ?? null,
      }
    }),
    accountNews: (accountNewsResult.data ?? []).map((row) => {
      const seg = String(row.segment ?? 'customer')
      const segment: 'customer' | 'prospect' = seg === 'prospect' ? 'prospect' : 'customer'
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
        <CompanyDetailClient
          company={company}
          strategy={strategy}
          stakeholders={stakeholders}
          internalContacts={internalContacts}
          externalContacts={(externalContactsResult ?? []) as ExternalContactRow[]}
          references={references}
          activeDeals={activeDeals}
          marketSignals={marketSignals}
          initialEditOpen={initialEditOpen}
        />
      </div>
    </div>
  )
}
