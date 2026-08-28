import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { revalidateTenderSurfaces } from '@/lib/tenders/revalidate-tender-surfaces'

type Client = SupabaseClient<Database>

const PERMUTATION_ERROR =
  'Die Rangfolge muss genau die Lose dieser Ausschreibung enthalten.'

export function parseLotPriorityOrder(
  orderedDealIds: readonly string[],
  lotIds: readonly string[],
): { ok: true } | { ok: false; error: string } {
  if (orderedDealIds.length !== lotIds.length) {
    return { ok: false, error: PERMUTATION_ERROR }
  }
  if (new Set(orderedDealIds).size !== orderedDealIds.length) {
    return { ok: false, error: PERMUTATION_ERROR }
  }
  const expected = new Set(lotIds)
  if (orderedDealIds.some((id) => !expected.has(id))) {
    return { ok: false, error: PERMUTATION_ERROR }
  }
  return { ok: true }
}

export async function setTenderLotPriorities(
  supabase: Client,
  args: {
    organizationId: string
    tenderId: string
    orderedDealIds: string[]
  },
): Promise<{ success: boolean; error?: string }> {
  const { data: lots, error: loadError } = await supabase
    .from('deals')
    .select('id')
    .eq('tender_id', args.tenderId)
    .eq('organization_id', args.organizationId)

  if (loadError) return { success: false, error: loadError.message }

  const parsed = parseLotPriorityOrder(
    args.orderedDealIds,
    (lots ?? []).map((row) => row.id),
  )
  if (!parsed.ok) return { success: false, error: parsed.error }

  const { error: resetError } = await supabase
    .from('deals')
    .update({ lot_priority: null })
    .eq('tender_id', args.tenderId)
    .eq('organization_id', args.organizationId)
  if (resetError) return { success: false, error: resetError.message }

  for (let rank = 0; rank < args.orderedDealIds.length; rank += 1) {
    const dealId = args.orderedDealIds[rank]
    if (!dealId) continue
    const { error } = await supabase
      .from('deals')
      .update({ lot_priority: rank + 1 })
      .eq('id', dealId)
      .eq('tender_id', args.tenderId)
      .eq('organization_id', args.organizationId)
    if (error) return { success: false, error: error.message }
  }

  await revalidateTenderSurfaces(supabase, {
    organizationId: args.organizationId,
    tenderId: args.tenderId,
  })
  return { success: true }
}
