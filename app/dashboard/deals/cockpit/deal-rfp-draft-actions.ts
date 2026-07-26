'use server'

import { revalidatePath } from 'next/cache'

import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import type { PersistedDealDeskAnalysisSnapshot } from '@/lib/deal-desk/analysis-snapshot'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type UpdateDealRfpDraftAnswerResult =
  | { success: true }
  | { success: false; error: string }

export async function updateDealRfpDraftAnswer(params: {
  dealId: string
  draftId: string
  answer: string
}): Promise<UpdateDealRfpDraftAnswerResult> {
  const user = await getRequestUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation.' }

  const dealId = params.dealId.trim()
  const draftId = params.draftId.trim()
  if (!dealId || !draftId) return { success: false, error: 'Ungültige Parameter.' }

  const supabase = await createServerSupabaseClient()
  const { data: project, error: findError } = await supabase
    .from('deal_desk_projects')
    .select('id, analysis_snapshot')
    .eq('organization_id', orgId)
    .eq('deal_id', dealId)
    .eq('analysis_status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError || !project?.id) {
    return { success: false, error: findError?.message ?? 'Keine Analyse gefunden.' }
  }

  const raw = project.analysis_snapshot
  if (!raw || typeof raw !== 'object') {
    return { success: false, error: 'Analyse-Snapshot ungültig.' }
  }

  const snap = raw as PersistedDealDeskAnalysisSnapshot
  const draftRows = Array.isArray(snap.draftRows) ? [...snap.draftRows] : []
  const idx = draftRows.findIndex((r) => r.id === draftId)
  if (idx < 0) return { success: false, error: 'Entwurf nicht gefunden.' }

  const nextAnswer = params.answer.trim() || null
  draftRows[idx] = { ...draftRows[idx]!, answer: nextAnswer }

  const { error: updateError } = await supabase
    .from('deal_desk_projects')
    .update({
      analysis_snapshot: { ...snap, draftRows },
      updated_at: new Date().toISOString(),
    })
    .eq('id', project.id)
    .eq('organization_id', orgId)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(ROUTES.deals.detail(dealId))
  return { success: true }
}
