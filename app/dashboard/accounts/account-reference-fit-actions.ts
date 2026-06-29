'use server'

import { revalidateTag } from 'next/cache'

import {
  accountReferenceFitTag,
  getCachedAccountReferenceFitScores,
} from '@/lib/accounts/account-reference-fit'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function fetchAccountReferenceFitScoresAction(
  companyId: string,
  referenceIds: string[]
): Promise<
  | { success: true; scores: Record<string, number> }
  | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, name, industry, headquarters, description, organization_id')
    .eq('id', companyId)
    .eq('organization_id', visibility.organizationId)
    .maybeSingle()

  if (companyErr || !company) {
    return { success: false, error: 'Account nicht gefunden oder keine Berechtigung.' }
  }

  const { data: strategy } = await supabase
    .from('company_strategies')
    .select('main_goals')
    .eq('company_id', companyId)
    .maybeSingle()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).' }
  }

  const scores = await getCachedAccountReferenceFitScores({
    organizationId: visibility.organizationId,
    salesVisibleOnly: visibility.salesVisibleOnly,
    companyId,
    company: {
      name: company.name ?? 'Account',
      industry: company.industry ?? null,
      headquarters: company.headquarters ?? null,
      description: company.description ?? null,
      companyGoals: (strategy as { main_goals?: string | null } | null)?.main_goals ?? null,
    },
    referenceIds,
    apiKey,
  })

  return { success: true, scores }
}

export async function invalidateAccountReferenceFitCache(companyId: string) {
  revalidateTag(accountReferenceFitTag(companyId), 'max')
}
