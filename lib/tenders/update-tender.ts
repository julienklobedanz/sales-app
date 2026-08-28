import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import {
  parseLotPrioritySelect,
  parseOptionalPositiveInt,
  type LotPrioritySelectValue,
} from '@/lib/tenders/lot-award-limits'
import { isTenderProcedureType } from '@/lib/tenders/procedure-types'
import { revalidateTenderSurfaces } from '@/lib/tenders/revalidate-tender-surfaces'

type Client = SupabaseClient<Database>

export type UpdateTenderStammdatenInput = {
  title: string
  procedureType: string | null
  referenceNumber: string | null
  totalVolume: string | null
  maxLotsBid: string
  maxLotsAward: string
  lotPriorityRequired: LotPrioritySelectValue
}

export type TenderStammdatenPatch = {
  title: string
  procedure_type: string | null
  reference_number: string | null
  total_volume: string | null
  max_lots_bid: number | null
  max_lots_award: number | null
  lot_priority_required: boolean | null
}

export function parseTenderStammdatenPatch(
  input: UpdateTenderStammdatenInput,
): { ok: true; patch: TenderStammdatenPatch } | { ok: false; error: string } {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Titel ist erforderlich.' }

  const procedureRaw = input.procedureType?.trim() || null
  const procedure_type =
    procedureRaw && isTenderProcedureType(procedureRaw) ? procedureRaw : null
  if (procedureRaw && !procedure_type) {
    return { ok: false, error: 'Verfahrensart ist ungültig.' }
  }

  const bid = parseOptionalPositiveInt(input.maxLotsBid)
  if (!bid.ok) return bid
  const award = parseOptionalPositiveInt(input.maxLotsAward)
  if (!award.ok) return award

  return {
    ok: true,
    patch: {
      title,
      procedure_type,
      reference_number: input.referenceNumber?.trim() || null,
      total_volume: input.totalVolume?.trim() || null,
      max_lots_bid: bid.value,
      max_lots_award: award.value,
      lot_priority_required: parseLotPrioritySelect(input.lotPriorityRequired),
    },
  }
}

export async function updateTenderStammdaten(
  supabase: Client,
  args: {
    organizationId: string
    tenderId: string
    fields: UpdateTenderStammdatenInput
  },
): Promise<{ success: boolean; error?: string }> {
  const parsed = parseTenderStammdatenPatch(args.fields)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const { error } = await supabase
    .from('tenders')
    .update({
      ...parsed.patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.tenderId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }

  await revalidateTenderSurfaces(supabase, {
    organizationId: args.organizationId,
    tenderId: args.tenderId,
  })
  return { success: true }
}
