import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

import {
  resolveDealDeadline,
  type ResolvedDealDeadline,
  type SubmissionDeadlineInput,
} from './resolve-deal-deadline'

type Client = SupabaseClient<Database>

type DealDeadlineRef = {
  id: string
  tender_id: string | null
  expiry_date: string | null
}

type SubmissionRow = SubmissionDeadlineInput & {
  deal_id: string | null
  tender_id: string | null
}

export async function loadResolvedDealDeadlines(
  supabase: Client,
  args: { organizationId: string; deals: DealDeadlineRef[] },
): Promise<Map<string, ResolvedDealDeadline>> {
  const resolved = new Map<string, ResolvedDealDeadline>()
  if (args.deals.length === 0) return resolved

  const dealIds = args.deals.map((deal) => deal.id)
  const tenderIds = [
    ...new Set(
      args.deals.map((deal) => deal.tender_id).filter((id): id is string => Boolean(id)),
    ),
  ]

  let query = supabase
    .from('deal_deadlines')
    .select('deal_id, tender_id, due_at, due_text, is_approximate, suppressed_at')
    .eq('organization_id', args.organizationId)
    .eq('kind', 'submission')
    .is('suppressed_at', null)

  query =
    tenderIds.length > 0
      ? query.or(
          `deal_id.in.(${dealIds.join(',')}),tender_id.in.(${tenderIds.join(',')})`,
        )
      : query.in('deal_id', dealIds)

  const { data } = await query
  const rows = (data ?? []) as SubmissionRow[]

  const byDeal = new Map<string, SubmissionDeadlineInput[]>()
  const byTender = new Map<string, SubmissionDeadlineInput[]>()
  for (const row of rows) {
    const input: SubmissionDeadlineInput = {
      due_at: row.due_at,
      due_text: row.due_text,
      is_approximate: row.is_approximate,
      suppressed_at: row.suppressed_at,
    }
    if (row.deal_id) {
      const list = byDeal.get(row.deal_id) ?? []
      list.push(input)
      byDeal.set(row.deal_id, list)
    }
    if (row.tender_id && !row.deal_id) {
      const list = byTender.get(row.tender_id) ?? []
      list.push(input)
      byTender.set(row.tender_id, list)
    }
  }

  for (const deal of args.deals) {
    resolved.set(
      deal.id,
      resolveDealDeadline({
        lotSubmissions: byDeal.get(deal.id) ?? [],
        tenderSubmissions: deal.tender_id ? (byTender.get(deal.tender_id) ?? []) : [],
        expiryDate: deal.expiry_date,
      }),
    )
  }

  return resolved
}
