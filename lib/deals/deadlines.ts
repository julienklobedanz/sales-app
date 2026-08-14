import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealDeskTimelineItem } from '@/lib/deal-desk/deal-analysis-types'

import type { DealDeadlineRow } from './deadline-display'
import { mapTimelineToRfpDeadlineRows } from './deadline-rfp-mapper'
import { buildManualDeadlineSourceKey } from './deadline-source-key'
import type { DealDeadlineKind } from './deadline-types'

export async function listDealDeadlines(
  supabase: SupabaseClient,
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

export async function syncRfpDeadlinesFromTimeline(
  supabase: SupabaseClient,
  args: {
    dealId: string
    organizationId: string
    timelineItems: DealDeskTimelineItem[]
  },
): Promise<{ synced: number; error?: string }> {
  const rows = mapTimelineToRfpDeadlineRows(args.dealId, args.timelineItems)
  let synced = 0

  for (const row of rows) {
    const { error } = await supabase.rpc('upsert_deal_rfp_deadline', {
      p_deal_id: args.dealId,
      p_organization_id: args.organizationId,
      p_kind: row.kind,
      p_label: row.label,
      p_due_at: row.due_at,
      p_due_text: row.due_text,
      p_is_approximate: row.is_approximate,
      p_source_key: row.source_key,
    })
    if (error) return { synced, error: error.message }
    synced += 1
  }

  return { synced }
}

export async function createManualDealDeadline(
  supabase: SupabaseClient,
  args: {
    dealId: string
    organizationId: string
    userId: string
    kind: DealDeadlineKind
    label: string
    dueAt: string | null
    dueText: string | null
    isApproximate: boolean
  },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('deal_deadlines').insert({
    deal_id: args.dealId,
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
  supabase: SupabaseClient,
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
  const patch: Record<string, unknown> = {
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
  supabase: SupabaseClient,
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
