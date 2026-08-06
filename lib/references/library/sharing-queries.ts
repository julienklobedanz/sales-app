'use server'

import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeStatus } from '@/lib/references/library/sharing-helpers'

import type { ReferenceRow } from '@/app/dashboard/actions'

export async function getPortfolioViewSessionsForReferenceImpl(
  referenceId: string,
  limit = 8,
): Promise<
  Array<{
    id: string
    startedAt: string
    countryCode: string | null
    activeSeconds: number
    recipientLabel: string | null
    visitorName: string | null
  }>
> {
  const supabase = await createServerSupabaseClient()
  const { data: rows, error: findErr } = await supabase
    .from('shared_portfolios')
    .select('id, slug')
    .eq('is_active', true)
    .contains('reference_ids', [referenceId])
    .limit(1)
  if (findErr || !rows?.[0]?.id) return []

  const spId = rows[0].id
  const { data: sessions, error } = await supabase
    .from('portfolio_view_sessions')
    .select(
      'id, started_at, country_code, active_seconds, visitor_name, recipient_id, shared_portfolio_recipients(label)',
    )
    .eq('shared_portfolio_id', spId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error || !sessions?.length) return []

  return sessions.map((s) => {
    const rec = Array.isArray(s.shared_portfolio_recipients)
      ? s.shared_portfolio_recipients[0]
      : s.shared_portfolio_recipients
    return {
      id: s.id,
      startedAt: s.started_at,
      countryCode: s.country_code ?? null,
      activeSeconds: Number(s.active_seconds) || 0,
      recipientLabel: rec?.label?.trim() || null,
      visitorName: s.visitor_name ?? null,
    }
  })
}

export async function getReferencesByIdsImpl(ids: string[]): Promise<ReferenceRow[]> {
  if (!ids.length) return []
  const supabase = await createServerSupabaseClient()
  const { data: rows } = await supabase
    .from('references')
    .select(
      `
      id, title, summary, industry, country, website, employee_count,
      volume_eur, contract_type, incumbent_provider, competitors,
      customer_challenge, our_solution, status, customer_approval_status, created_at, updated_at,
      company_id, contact_id, file_path, tags, project_status, project_start, project_end,
      is_nda_deal,
      companies ( name, logo_url )
    `,
    )
    .in('id', ids)
    .is('deleted_at', null)
  if (!rows?.length) return []
  return rows.map((r) => {
    const company = accountFromJoin(r.companies)
    const start = r.project_start
    const end = r.project_end
    let duration_months: number | null = null
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        duration_months = Math.max(
          0,
          (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()),
        )
      }
    }
    return {
      id: r.id,
      title: r.title,
      summary: r.summary ?? null,
      industry: r.industry ?? null,
      country: r.country ?? null,
      website: r.website ?? null,
      employee_count: r.employee_count ?? null,
      volume_eur: r.volume_eur ?? null,
      contract_type: r.contract_type ?? null,
      incumbent_provider: r.incumbent_provider ?? null,
      competitors: r.competitors ?? null,
      customer_challenge: r.customer_challenge ?? null,
      our_solution: r.our_solution ?? null,
      status: normalizeStatus(r.status),
      customer_approval_status: r.customer_approval_status ?? null,
      created_at: r.created_at ?? '',
      updated_at: r.updated_at ?? null,
      company_id: r.company_id,
      company_name: company?.name ?? '—',
      company_logo_url: company?.logoUrl ?? null,
      contact_id: r.contact_id ?? null,
      contact_email: null,
      contact_display: null,
      customer_contact: null,
      file_path: r.file_path ?? null,
      is_favorited: false,
      tags: r.tags ?? null,
      project_status: (r.project_status as 'active' | 'completed' | null) ?? null,
      project_start: r.project_start ?? null,
      project_end: r.project_end ?? null,
      duration_months,
      is_nda_deal: r.is_nda_deal ?? false,
    }
  })
}
