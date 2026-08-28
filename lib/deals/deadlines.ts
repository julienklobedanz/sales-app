import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealDeskTimelineItem } from '@/lib/deal-desk/deal-analysis-types'
import type { Database } from '@/lib/database.types'

import type { DealDeadlineRow } from './deadline-display'
import {
  mapTimelineToRfpDeadlineRows,
  rfpDeadlineRpcDueArgs,
} from './deadline-rfp-mapper'
import { buildManualDeadlineSourceKey } from './deadline-source-key'
import type { DealDeadlineKind } from './deadline-types'

type Client = SupabaseClient<Database>

export async function listDealDeadlines(
  supabase: Client,
  dealId: string,
): Promise<DealDeadlineRow[]> {
  const { data, error } = await supabase
    .from('deal_deadlines')
    .select('*')
    .eq('deal_id', dealId)
    .is('suppressed_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) return []
  return (data ?? []) as DealDeadlineRow[]
}

export async function listTenderDeadlines(
  supabase: Client,
  tenderId: string,
): Promise<DealDeadlineRow[]> {
  const { data, error } = await supabase
    .from('deal_deadlines')
    .select('*')
    .eq('tender_id', tenderId)
    .is('suppressed_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) return []
  return (data ?? []) as DealDeadlineRow[]
}

export async function syncRfpDeadlinesFromTimeline(
  supabase: Client,
  args: {
    dealId: string
    organizationId: string
    timelineItems: DealDeskTimelineItem[]
  },
): Promise<{ synced: number; tenderId?: string | null; error?: string }> {
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('tender_id')
    .eq('id', args.dealId)
    .eq('organization_id', args.organizationId)
    .maybeSingle()

  if (dealError) return { synced: 0, error: dealError.message }

  const tenderId = deal?.tender_id ?? null
  const ownerId = tenderId ?? args.dealId
  const rows = mapTimelineToRfpDeadlineRows(ownerId, args.timelineItems)
  let synced = 0

  for (const row of rows) {
    const due = rfpDeadlineRpcDueArgs(row)
    const { error } = tenderId
      ? await supabase.rpc('upsert_tender_rfp_deadline', {
          p_tender_id: tenderId,
          p_organization_id: args.organizationId,
          p_kind: row.kind,
          p_label: row.label,
          ...due,
          p_is_approximate: row.is_approximate,
          p_source_key: row.source_key,
        })
      : await supabase.rpc('upsert_deal_rfp_deadline', {
          p_deal_id: args.dealId,
          p_organization_id: args.organizationId,
          p_kind: row.kind,
          p_label: row.label,
          ...due,
          p_is_approximate: row.is_approximate,
          p_source_key: row.source_key,
        })
    if (error) return { synced, tenderId, error: error.message }
    synced += 1
  }

  return { synced, tenderId }
}

export async function createManualDealDeadline(
  supabase: Client,
  args: {
    dealId?: string | null
    tenderId?: string | null
    organizationId: string
    userId: string
    kind: DealDeadlineKind
    label: string
    dueAt: string | null
    dueText: string | null
    isApproximate: boolean
  },
): Promise<{ success: boolean; error?: string }> {
  const dealId = args.dealId?.trim() || null
  const tenderId = args.tenderId?.trim() || null
  if ((dealId == null) === (tenderId == null)) {
    return { success: false, error: 'Genau ein Eigentümer ist erforderlich.' }
  }

  const { error } = await supabase.from('deal_deadlines').insert({
    deal_id: dealId,
    tender_id: tenderId,
    organization_id: args.organizationId,
    kind: args.kind,
    label: args.label.trim(),
    due_at: args.dueAt,
    due_text: args.dueText,
    is_approximate: args.isApproximate,
    source: 'manual',
    source_key: buildManualDeadlineSourceKey(),
    created_by: args.userId,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateDealDeadline(
  supabase: Client,
  args: {
    deadlineId: string
    organizationId: string
    kind: DealDeadlineKind
    label: string
    dueAt: string | null
    dueText: string | null
    isApproximate: boolean
    source: 'rfp' | 'manual'
  },
): Promise<{ success: boolean; error?: string }> {
  const patch: Database['public']['Tables']['deal_deadlines']['Update'] = {
    kind: args.kind,
    label: args.label.trim(),
    due_at: args.dueAt,
    due_text: args.dueText,
    is_approximate: args.isApproximate,
    updated_at: new Date().toISOString(),
  }

  if (args.source === 'rfp') {
    patch.pinned = true
  }

  const { error } = await supabase
    .from('deal_deadlines')
    .update(patch)
    .eq('id', args.deadlineId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function suppressDealDeadline(
  supabase: Client,
  args: { deadlineId: string; organizationId: string },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('deal_deadlines')
    .update({
      suppressed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.deadlineId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
