import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  reconcileDealRfpRequirements,
  type ExistingDealRfpRequirement,
} from '@/lib/deals/reconcile-deal-rfp-requirements'

type RequirementInput = {
  text: string
  category?: string | null
}

export async function persistDealRfpRequirements(
  supabase: SupabaseClient,
  args: {
    dealId: string
    organizationId: string
    requirements: RequirementInput[]
  },
): Promise<{ error?: string }> {
  const { data: rows, error: loadError } = await supabase
    .from('deal_rfp_requirements')
    .select('id, normalized_text, status')
    .eq('deal_id', args.dealId)
    .eq('organization_id', args.organizationId)

  if (loadError) return { error: loadError.message }

  const existing: ExistingDealRfpRequirement[] = (rows ?? []).map((row) => ({
    id: row.id,
    normalizedText: row.normalized_text,
    status: row.status === 'entfallen' ? 'entfallen' : 'aktiv',
  }))

  const plan = reconcileDealRfpRequirements(existing, args.requirements)
  const now = new Date().toISOString()

  if (plan.keepIds.length > 0) {
    const { error } = await supabase
      .from('deal_rfp_requirements')
      .update({ status: 'aktiv', last_seen_at: now })
      .in('id', plan.keepIds)
      .eq('organization_id', args.organizationId)
    if (error) return { error: error.message }
  }

  if (plan.dropIds.length > 0) {
    const { error } = await supabase
      .from('deal_rfp_requirements')
      .update({ status: 'entfallen' })
      .in('id', plan.dropIds)
      .eq('organization_id', args.organizationId)
    if (error) return { error: error.message }
  }

  if (plan.insert.length > 0) {
    const { error } = await supabase.from('deal_rfp_requirements').insert(
      plan.insert.map((row) => ({
        deal_id: args.dealId,
        organization_id: args.organizationId,
        text: row.text,
        normalized_text: row.normalizedText,
        category: row.category,
        status: 'aktiv' as const,
        first_seen_at: now,
        last_seen_at: now,
      })),
    )
    if (error) return { error: error.message }
  }

  return {}
}
