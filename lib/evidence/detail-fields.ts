'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export async function updateReferenceDetailFieldsImpl(
  id: string,
  payload: {
    project_status?: 'active' | 'completed' | null
    incumbent_provider?: string | null
    competitors?: string | null
  }
) {
  const supabase = await createServerSupabaseClient()
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.project_status !== undefined) {
    updatePayload.project_status = payload.project_status
  }
  if (payload.incumbent_provider !== undefined) {
    updatePayload.incumbent_provider = payload.incumbent_provider || null
  }
  if (payload.competitors !== undefined) {
    updatePayload.competitors = payload.competitors || null
  }
  const { error } = await supabase.from('references').update(updatePayload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.edit(id))
}

