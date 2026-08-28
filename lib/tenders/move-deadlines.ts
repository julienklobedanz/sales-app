import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { rfpDeadlineRpcDueArgs } from '@/lib/deals/deadline-rfp-mapper'
import {
  buildManualDeadlineSourceKey,
  buildRfpDeadlineSourceKey,
} from '@/lib/deals/deadline-source-key'
import type { DealDeadlineKind } from '@/lib/deals/deadline-types'

type Client = SupabaseClient<Database>
type DeadlineRow = Database['public']['Tables']['deal_deadlines']['Row']

async function pinBySourceKey(
  supabase: Client,
  args: {
    organizationId: string
    sourceKey: string
    owner: { kind: 'deal'; id: string } | { kind: 'tender'; id: string }
  },
): Promise<{ success: boolean; error?: string }> {
  let query = supabase
    .from('deal_deadlines')
    .update({ pinned: true, updated_at: new Date().toISOString() })
    .eq('organization_id', args.organizationId)
    .eq('source_key', args.sourceKey)
    .eq('source', 'rfp')

  query =
    args.owner.kind === 'tender'
      ? query.eq('tender_id', args.owner.id)
      : query.eq('deal_id', args.owner.id)

  const { error } = await query
  if (error) return { success: false, error: error.message }
  return { success: true }
}

async function applyPinnedAndSuppressed(
  supabase: Client,
  args: {
    organizationId: string
    sourceKey: string
    dealId: string
    pinned: boolean
    suppressedAt: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  if (!args.pinned && !args.suppressedAt) return { success: true }

  const patch: Database['public']['Tables']['deal_deadlines']['Update'] = {
    updated_at: new Date().toISOString(),
  }
  if (args.pinned) patch.pinned = true
  if (args.suppressedAt) patch.suppressed_at = args.suppressedAt

  const { error } = await supabase
    .from('deal_deadlines')
    .update(patch)
    .eq('organization_id', args.organizationId)
    .eq('deal_id', args.dealId)
    .eq('source_key', args.sourceKey)
    .eq('source', 'rfp')

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** Aktive RFP-Fristen des Loses wandern zur Ausschreibung. Ausgeblendete und manuelle bleiben. */
export async function promoteActiveRfpDeadlinesToTender(
  supabase: Client,
  args: { organizationId: string; dealId: string; tenderId: string },
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('deal_deadlines')
    .select('*')
    .eq('deal_id', args.dealId)
    .eq('organization_id', args.organizationId)
    .eq('source', 'rfp')
    .is('suppressed_at', null)

  if (error) return { success: false, error: error.message }

  for (const row of data ?? []) {
    const kind = row.kind as DealDeadlineKind
    const sourceKey = buildRfpDeadlineSourceKey(args.tenderId, kind, row.label)
    const { error: upsertError } = await supabase.rpc('upsert_tender_rfp_deadline', {
      p_tender_id: args.tenderId,
      p_organization_id: args.organizationId,
      p_kind: kind,
      p_label: row.label,
      ...rfpDeadlineRpcDueArgs(row),
      p_is_approximate: row.is_approximate,
      p_source_key: sourceKey,
    })
    if (upsertError) return { success: false, error: upsertError.message }

    if (row.pinned) {
      const pinned = await pinBySourceKey(supabase, {
        organizationId: args.organizationId,
        sourceKey,
        owner: { kind: 'tender', id: args.tenderId },
      })
      if (!pinned.success) return pinned
    }

    const { error: deleteError } = await supabase
      .from('deal_deadlines')
      .delete()
      .eq('id', row.id)
      .eq('organization_id', args.organizationId)
    if (deleteError) return { success: false, error: deleteError.message }
  }

  return { success: true }
}

async function demoteRfpDeadline(
  supabase: Client,
  args: { organizationId: string; dealId: string; row: DeadlineRow },
): Promise<{ success: boolean; error?: string }> {
  const kind = args.row.kind as DealDeadlineKind
  const sourceKey = buildRfpDeadlineSourceKey(args.dealId, kind, args.row.label)

  const { error: ghostError } = await supabase
    .from('deal_deadlines')
    .delete()
    .eq('deal_id', args.dealId)
    .eq('organization_id', args.organizationId)
    .eq('source', 'rfp')
    .eq('source_key', sourceKey)
  if (ghostError) return { success: false, error: ghostError.message }

  const { error: upsertError } = await supabase.rpc('upsert_deal_rfp_deadline', {
    p_deal_id: args.dealId,
    p_organization_id: args.organizationId,
    p_kind: kind,
    p_label: args.row.label,
    ...rfpDeadlineRpcDueArgs(args.row),
    p_is_approximate: args.row.is_approximate,
    p_source_key: sourceKey,
  })
  if (upsertError) return { success: false, error: upsertError.message }

  const applied = await applyPinnedAndSuppressed(supabase, {
    organizationId: args.organizationId,
    sourceKey,
    dealId: args.dealId,
    pinned: args.row.pinned,
    suppressedAt: args.row.suppressed_at,
  })
  if (!applied.success) return applied

  const { error: deleteError } = await supabase
    .from('deal_deadlines')
    .delete()
    .eq('id', args.row.id)
    .eq('organization_id', args.organizationId)
  if (deleteError) return { success: false, error: deleteError.message }

  return { success: true }
}

async function demoteManualDeadline(
  supabase: Client,
  args: { organizationId: string; dealId: string; row: DeadlineRow },
): Promise<{ success: boolean; error?: string }> {
  const { error: insertError } = await supabase.from('deal_deadlines').insert({
    deal_id: args.dealId,
    tender_id: null,
    organization_id: args.organizationId,
    kind: args.row.kind,
    label: args.row.label,
    due_at: args.row.due_at,
    due_text: args.row.due_text,
    is_approximate: args.row.is_approximate,
    source: 'manual',
    source_key: buildManualDeadlineSourceKey(),
    pinned: args.row.pinned,
    suppressed_at: args.row.suppressed_at,
    created_by: args.row.created_by,
  })
  if (insertError) return { success: false, error: insertError.message }

  const { error: deleteError } = await supabase
    .from('deal_deadlines')
    .delete()
    .eq('id', args.row.id)
    .eq('organization_id', args.organizationId)
  if (deleteError) return { success: false, error: deleteError.message }

  return { success: true }
}

/** Alle Fristen der Ausschreibung wandern ans letzte Los, bevor die Klammer gelöscht wird. */
export async function demoteTenderDeadlinesToDeal(
  supabase: Client,
  args: { organizationId: string; dealId: string; tenderId: string },
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('deal_deadlines')
    .select('*')
    .eq('tender_id', args.tenderId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }

  for (const row of data ?? []) {
    const moved =
      row.source === 'rfp'
        ? await demoteRfpDeadline(supabase, {
            organizationId: args.organizationId,
            dealId: args.dealId,
            row,
          })
        : await demoteManualDeadline(supabase, {
            organizationId: args.organizationId,
            dealId: args.dealId,
            row,
          })
    if (!moved.success) return moved
  }

  return { success: true }
}
