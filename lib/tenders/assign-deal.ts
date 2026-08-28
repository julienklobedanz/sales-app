import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import {
  demoteTenderDeadlinesToDeal,
  promoteActiveRfpDeadlinesToTender,
} from './move-deadlines'
import { demoteTenderDocumentsToDeal } from './move-documents'
import { isTenderProcedureType, type TenderProcedureType } from './procedure-types'
import { revalidateTenderSurfaces } from './revalidate-tender-surfaces'

type Client = SupabaseClient<Database>

async function loadDealForOrg(
  supabase: Client,
  args: { dealId: string; organizationId: string },
) {
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, company_id, tender_id, organization_id')
    .eq('id', args.dealId)
    .eq('organization_id', args.organizationId)
    .maybeSingle()
  if (error || !data) return null
  return data
}

export async function createTenderAndAssignDeal(
  supabase: Client,
  args: {
    organizationId: string
    dealId: string
    title: string
    procedureType?: TenderProcedureType | null
    totalVolume?: string | null
    referenceNumber?: string | null
  },
): Promise<{ success: boolean; error?: string; tenderId?: string }> {
  const title = args.title.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const deal = await loadDealForOrg(supabase, {
    dealId: args.dealId,
    organizationId: args.organizationId,
  })
  if (!deal) return { success: false, error: 'Deal nicht gefunden.' }
  if (deal.tender_id) {
    return { success: false, error: 'Los ist bereits einer Ausschreibung zugeordnet.' }
  }

  const procedureType =
    args.procedureType && isTenderProcedureType(args.procedureType)
      ? args.procedureType
      : null

  const { data: tender, error: insertError } = await supabase
    .from('tenders')
    .insert({
      organization_id: args.organizationId,
      title,
      company_id: deal.company_id,
      procedure_type: procedureType,
      total_volume: args.totalVolume?.trim() || null,
      reference_number: args.referenceNumber?.trim() || null,
    })
    .select('id')
    .single()

  if (insertError || !tender) {
    return {
      success: false,
      error: insertError?.message ?? 'Ausschreibung konnte nicht angelegt werden.',
    }
  }

  const { error: updateError } = await supabase
    .from('deals')
    .update({ tender_id: tender.id })
    .eq('id', deal.id)
    .eq('organization_id', args.organizationId)
    .is('tender_id', null)

  if (updateError) {
    await supabase.from('tenders').delete().eq('id', tender.id)
    return { success: false, error: updateError.message }
  }

  const moved = await promoteActiveRfpDeadlinesToTender(supabase, {
    organizationId: args.organizationId,
    dealId: deal.id,
    tenderId: tender.id,
  })
  if (!moved.success) return moved

  await revalidateTenderSurfaces(supabase, {
    organizationId: args.organizationId,
    tenderId: tender.id,
    extraDealId: deal.id,
  })
  return { success: true, tenderId: tender.id }
}

export async function assignDealToExistingTender(
  supabase: Client,
  args: { organizationId: string; dealId: string; tenderId: string },
): Promise<{ success: boolean; error?: string; tenderId?: string }> {
  const deal = await loadDealForOrg(supabase, {
    dealId: args.dealId,
    organizationId: args.organizationId,
  })
  if (!deal) return { success: false, error: 'Deal nicht gefunden.' }
  if (deal.tender_id) {
    return { success: false, error: 'Los ist bereits einer Ausschreibung zugeordnet.' }
  }

  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select('id')
    .eq('id', args.tenderId)
    .eq('organization_id', args.organizationId)
    .maybeSingle()
  if (tenderError || !tender) {
    return { success: false, error: 'Ausschreibung nicht gefunden.' }
  }

  const { error: updateError } = await supabase
    .from('deals')
    .update({ tender_id: tender.id })
    .eq('id', deal.id)
    .eq('organization_id', args.organizationId)
    .is('tender_id', null)

  if (updateError) return { success: false, error: updateError.message }

  const moved = await promoteActiveRfpDeadlinesToTender(supabase, {
    organizationId: args.organizationId,
    dealId: deal.id,
    tenderId: tender.id,
  })
  if (!moved.success) return moved

  await revalidateTenderSurfaces(supabase, {
    organizationId: args.organizationId,
    tenderId: tender.id,
    extraDealId: deal.id,
  })
  return { success: true, tenderId: tender.id }
}

export async function detachDealFromTender(
  supabase: Client,
  args: { organizationId: string; dealId: string },
): Promise<{ success: boolean; error?: string }> {
  const deal = await loadDealForOrg(supabase, {
    dealId: args.dealId,
    organizationId: args.organizationId,
  })
  if (!deal) return { success: false, error: 'Deal nicht gefunden.' }
  if (!deal.tender_id) {
    return { success: false, error: 'Los hängt an keiner Ausschreibung.' }
  }

  const tenderId = deal.tender_id
  const { count, error: countError } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('tender_id', tenderId)
    .eq('organization_id', args.organizationId)

  if (countError) return { success: false, error: countError.message }

  if ((count ?? 0) <= 1) {
    const movedDocs = await demoteTenderDocumentsToDeal(supabase, {
      organizationId: args.organizationId,
      dealId: deal.id,
      tenderId,
    })
    if (!movedDocs.success) return movedDocs

    const moved = await demoteTenderDeadlinesToDeal(supabase, {
      organizationId: args.organizationId,
      dealId: deal.id,
      tenderId,
    })
    if (!moved.success) return moved

    const { error: deleteError } = await supabase
      .from('tenders')
      .delete()
      .eq('id', tenderId)
      .eq('organization_id', args.organizationId)
    if (deleteError) return { success: false, error: deleteError.message }
    await revalidateTenderSurfaces(supabase, {
      organizationId: args.organizationId,
      tenderId,
      extraDealId: deal.id,
    })
    return { success: true }
  }

  const { error: updateError } = await supabase
    .from('deals')
    .update({ tender_id: null })
    .eq('id', deal.id)
    .eq('organization_id', args.organizationId)

  if (updateError) return { success: false, error: updateError.message }

  await revalidateTenderSurfaces(supabase, {
    organizationId: args.organizationId,
    tenderId,
    extraDealId: deal.id,
  })
  return { success: true }
}
