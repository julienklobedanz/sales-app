import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { buildRfpDeadlineSourceKey } from '@/lib/deals/deadline-source-key'
import type { DealDeadlineKind } from '@/lib/deals/deadline-types'

type Client = SupabaseClient<Database>
type DeadlineRow = Database['public']['Tables']['deal_deadlines']['Row']

function isUniqueViolation(error: { code?: string; message: string }): boolean {
  return error.code === '23505' || /duplicate key|unique constraint/i.test(error.message)
}

async function relocateDeadline(
  supabase: Client,
  args: {
    id: string
    organizationId: string
    dealId: string | null
    tenderId: string | null
    sourceKey: string
  },
): Promise<{ success: boolean; uniqueViolation?: boolean; error?: string }> {
  const { error } = await supabase
    .from('deal_deadlines')
    .update({
      deal_id: args.dealId,
      tender_id: args.tenderId,
      source_key: args.sourceKey,
      is_submission_target: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.id)
    .eq('organization_id', args.organizationId)

  if (!error) return { success: true }
  if (isUniqueViolation(error)) return { success: false, uniqueViolation: true }
  return { success: false, error: error.message }
}

async function deleteDeadlineById(
  supabase: Client,
  args: { id: string; organizationId: string },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('deal_deadlines')
    .delete()
    .eq('id', args.id)
    .eq('organization_id', args.organizationId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Hoch: nur aktive rfp-Fristen. Ausgeblendete und manuelle bleiben am Los.
 * Unique am Ziel: die Quellzeile wird gelöscht, die vorhandene Tender-Zeile behält ihre id.
 */
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
    const moved = await relocateDeadline(supabase, {
      id: row.id,
      organizationId: args.organizationId,
      dealId: null,
      tenderId: args.tenderId,
      sourceKey,
    })
    if (moved.uniqueViolation) {
      const deleted = await deleteDeadlineById(supabase, {
        id: row.id,
        organizationId: args.organizationId,
      })
      if (!deleted.success) return deleted
      continue
    }
    if (!moved.success) return moved
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

  const moved = await relocateDeadline(supabase, {
    id: args.row.id,
    organizationId: args.organizationId,
    dealId: args.dealId,
    tenderId: null,
    sourceKey,
  })
  if (!moved.success) return { success: false, error: moved.error }
  return { success: true }
}

async function demoteManualDeadline(
  supabase: Client,
  args: { organizationId: string; dealId: string; row: DeadlineRow },
): Promise<{ success: boolean; error?: string }> {
  const moved = await relocateDeadline(supabase, {
    id: args.row.id,
    organizationId: args.organizationId,
    dealId: args.dealId,
    tenderId: null,
    sourceKey: args.row.source_key,
  })
  if (!moved.success) return { success: false, error: moved.error }
  return { success: true }
}

/**
 * Runter: alles — rfp und manual, samt pinned und suppressed_at —
 * bevor die Klammer gelöscht wird.
 */
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
