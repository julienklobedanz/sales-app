'use server'

import { getCachedAccountProofMemory, type AccountProofMemory } from '@/lib/accounts/account-proof-memory'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function fetchAccountProofMemoryAction(
  companyId: string
): Promise<{ success: true; memory: AccountProofMemory } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('organization_id', visibility.organizationId)
    .maybeSingle()

  if (companyErr || !company) {
    return { success: false, error: 'Account nicht gefunden oder keine Berechtigung.' }
  }

  const memory = await getCachedAccountProofMemory({
    organizationId: visibility.organizationId,
    companyId,
    salesVisibleOnly: visibility.salesVisibleOnly,
  })

  return { success: true, memory }
}
