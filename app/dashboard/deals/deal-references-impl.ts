import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { suggestDealReferenceMatches } from '@/lib/deals/suggest-deal-reference-matches'

export async function addReferenceToDealImpl(
  dealId: string,
  referenceId: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('deal_references')
    .insert({ deal_id: dealId, reference_id: referenceId })
  if (error) return { error: error.message }
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(dealId))
  return {}
}

export async function addReferenceToDealWithScoreImpl(args: {
  dealId: string
  referenceId: string
  similarityScore?: number | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('deal_references').insert({
    deal_id: args.dealId,
    reference_id: args.referenceId,
    similarity_score:
      typeof args.similarityScore === 'number' ? args.similarityScore : null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(args.dealId))
  revalidatePath(ROUTES.match)
  return { success: true }
}

export async function suggestReferencesForDealActionImpl(dealId: string) {
  return suggestDealReferenceMatches(dealId)
}

export async function removeReferenceFromDealImpl(
  dealId: string,
  referenceId: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('deal_references')
    .delete()
    .eq('deal_id', dealId)
    .eq('reference_id', referenceId)
  if (error) return { error: error.message }
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(dealId))
  revalidatePath(ROUTES.match)
  return {}
}

export async function recordReferenceHelpedImpl(args: {
  dealId: string
  referenceId: string
  helped: boolean
  comment?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { error } = await supabase.from('evidence_events').insert({
    organization_id: orgId,
    deal_id: args.dealId,
    reference_id: args.referenceId,
    event_type: 'reference_helped',
    payload: { helped: args.helped, comment: args.comment ?? null },
    created_by: user.id,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(args.dealId))
  return { success: true }
}
