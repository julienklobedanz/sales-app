'use server'

import {
  emptyCommandSearchGroups,
  searchCommandCenter,
  type CommandSearchGroups,
} from '@/lib/command-center/global-search'
import type { HomepageSemanticSearchResult } from '@/lib/command-center/homepage-semantic-types'
import {
  searchHomepageReferencesSemantic,
  searchReferencesSemanticLegacy,
} from '@/lib/command-center/search-references-semantic'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function loadSearchAuth() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null

  return {
    supabase,
    orgId: profile.organization_id as string,
    salesVisibleOnly: ((profile as { role?: string }).role ?? 'sales') === 'sales',
  }
}

/**
 * Homepage: semantische Referenz-Suche (nur nach Absenden im UI).
 */
export async function searchHomepageSemanticAction(
  rawQuery: string
): Promise<HomepageSemanticSearchResult> {
  const q = rawQuery.trim()
  if (!q) {
    return { success: false, query: '', error: 'Bitte eine Suchanfrage eingeben.' }
  }

  const auth = await loadSearchAuth()
  if (!auth) {
    return { success: false, query: q, error: 'Nicht angemeldet oder keine Organisation.' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      query: q,
      error: 'Semantische Suche ist deaktiviert (OPENAI_API_KEY fehlt).',
    }
  }

  const semantic = await searchHomepageReferencesSemantic({
    supabase: auth.supabase,
    apiKey,
    query: q,
    organizationId: auth.orgId,
    salesVisibleOnly: auth.salesVisibleOnly,
  })

  if (!semantic.ok) {
    return { success: false, query: q, error: semantic.error }
  }

  return { success: true, query: q, hits: semantic.hits }
}

/**
 * Legacy: gemischte Keyword-Suche (Command Palette o. Ä.).
 */
export async function searchCommandCenterAction(rawQuery: string): Promise<CommandSearchGroups> {
  const q = rawQuery.trim()
  if (!q) return emptyCommandSearchGroups()

  const auth = await loadSearchAuth()
  if (!auth) return emptyCommandSearchGroups()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return searchCommandCenter(auth.supabase, q)
  }

  const semantic = await searchReferencesSemanticLegacy({
    supabase: auth.supabase,
    apiKey,
    query: q,
    organizationId: auth.orgId,
    salesVisibleOnly: auth.salesVisibleOnly,
  })

  if (!semantic.ok) {
    return searchCommandCenter(auth.supabase, q)
  }

  return searchCommandCenter(auth.supabase, q, { referenceHits: semantic.hits })
}
