'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

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
