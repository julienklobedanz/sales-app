'use server'

import {
  emptyCommandSearchGroups,
  searchCommandCenter,
  type CommandSearchGroups,
} from '@/lib/command-center/global-search'
import { searchReferencesSemantic } from '@/lib/command-center/search-references-semantic'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Homepage Command Center: Referenzen semantisch (Embedding + match_references),
 * übrige Entitäten weiter per Keyword (ILIKE).
 */
export async function searchCommandCenterAction(rawQuery: string): Promise<CommandSearchGroups> {
  const q = rawQuery.trim()
  if (!q) return emptyCommandSearchGroups()

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return emptyCommandSearchGroups()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return emptyCommandSearchGroups()

  const orgId = profile.organization_id as string
  const role = (profile as { role?: string }).role ?? 'sales'
  const salesVisibleOnly = role === 'sales'

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return searchCommandCenter(supabase, q)
  }

  const semantic = await searchReferencesSemantic({
    supabase,
    apiKey,
    query: q,
    organizationId: orgId,
    salesVisibleOnly,
  })

  if (!semantic.ok) {
    return searchCommandCenter(supabase, q)
  }

  return searchCommandCenter(supabase, q, { referenceHits: semantic.hits })
}
