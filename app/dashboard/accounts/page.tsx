import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompaniesGrid } from './companies-grid'

export default async function AccountsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // is_favorite ist optional (Migration evtl. noch nicht ausgeführt) → fallback ohne Spalte
  let companies:
    | {
        id: string
        name: string
        logo_url: string | null
        website_url: string | null
        headquarters: string | null
        industry: string | null
        is_favorite?: boolean | null
      }[]
    | null = null

  const withFav = await supabase
    .from('companies')
    .select('id, name, logo_url, website_url, headquarters, industry, is_favorite')
    .eq('organization_id', profile.organization_id)
    .order('name')

  if (withFav.error && (withFav.error.message ?? '').includes('is_favorite')) {
    const withoutFav = await supabase
      .from('companies')
      .select('id, name, logo_url, website_url, headquarters, industry')
      .eq('organization_id', profile.organization_id)
      .order('name')
    companies = (withoutFav.data ?? []).map((c) => ({ ...c, is_favorite: false }))
  } else {
    companies = withFav.data ?? []
  }

  const companyIds = (companies ?? []).map((c) => c.id)

  // Counts für Score/Card: Deals, Referenzen, Stakeholder, Strategy-Filled
  const [dealsRows, refRows, stakeholderRows, strategyRows] = await Promise.all([
    companyIds.length
      ? supabase
          .from('deals')
          .select('id, company_id, status')
          .in('company_id', companyIds)
          .eq('organization_id', profile.organization_id)
      : Promise.resolve({ data: [] as { id: string; company_id: string | null; status: string }[] | null }),
    companyIds.length
      ? supabase
          .from('references')
          .select('id, company_id')
          .in('company_id', companyIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] as { id: string; company_id: string | null }[] | null }),
    companyIds.length
      ? supabase
          .from('stakeholders')
          .select('id, company_id')
          .in('company_id', companyIds)
      : Promise.resolve({ data: [] as { id: string; company_id: string | null }[] | null }),
    companyIds.length
      ? supabase
          .from('company_strategies')
          .select('company_id, main_goals, red_flags, competitive_situation, next_steps')
          .in('company_id', companyIds)
      : Promise.resolve({
          data: [] as {
            company_id: string
            main_goals: string | null
            red_flags: string | null
            competitive_situation: string | null
            next_steps: string | null
          }[] | null,
        }),
  ])

  const activeDealStatuses = new Set([
    'in_negotiation',
    'rfp_phase',
    'on_hold',
    'reference_sought',
    'in_approval',
    'reference_found',
  ])

  const dealCountByCompany: Record<string, number> = {}
  for (const d of dealsRows.data ?? []) {
    if (!d.company_id) continue
    if (!activeDealStatuses.has(d.status)) continue
    dealCountByCompany[d.company_id] = (dealCountByCompany[d.company_id] ?? 0) + 1
  }
  const refCountByCompany: Record<string, number> = {}
  for (const r of refRows.data ?? []) {
    if (!r.company_id) continue
    refCountByCompany[r.company_id] = (refCountByCompany[r.company_id] ?? 0) + 1
  }
  const stakeholderCountByCompany: Record<string, number> = {}
  for (const s of stakeholderRows.data ?? []) {
    if (!s.company_id) continue
    stakeholderCountByCompany[s.company_id] = (stakeholderCountByCompany[s.company_id] ?? 0) + 1
  }
  const strategyFilledByCompany: Record<string, boolean> = {}
  for (const st of strategyRows.data ?? []) {
    const filled = Boolean(
      (st.main_goals ?? '').trim() ||
        (st.red_flags ?? '').trim() ||
        (st.competitive_situation ?? '').trim() ||
        (st.next_steps ?? '').trim()
    )
    strategyFilledByCompany[st.company_id] = filled
  }

  const enrichedCompanies =
    (companies ?? []).map((c) => ({
      ...c,
      open_deals_count: dealCountByCompany[c.id] ?? 0,
      reference_count: refCountByCompany[c.id] ?? 0,
      stakeholder_count: stakeholderCountByCompany[c.id] ?? 0,
      strategy_filled: strategyFilledByCompany[c.id] ?? false,
    })) ?? []

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Strategisches Account-Management – Firmenübersicht, Opportunity Roadmap & Stakeholder-Mapping.
        </p>
      </div>

      <CompaniesGrid companies={enrichedCompanies} />
    </div>
  )
}
