'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type UpdateOrganizationResult =
  | { success: true }
  | { success: false; error: string }

export async function updateOrganization(
  organizationId: string,
  name: string
): Promise<UpdateOrganizationResult> {
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

  if (profile?.organization_id !== organizationId) {
    return { success: false, error: 'Keine Berechtigung für diesen Workspace.' }
  }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Name darf nicht leer sein.' }

  const { error } = await supabase
    .from('organizations')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
