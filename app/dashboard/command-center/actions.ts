'use server'

import type { HomepageSemanticSearchResult } from '@/lib/command-center/homepage-semantic-types'
import type { HomepageUniversalSearchResult } from '@/lib/command-center/homepage-universal-types'
import { searchHomepageBuckets } from '@/lib/command-center/search-homepage-buckets'
import { searchHomepageReferencesSemantic } from '@/lib/command-center/search-references-semantic'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function loadSearchAuth() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) return null

  return {
    supabase,
    orgId: visibility.organizationId,
    salesVisibleOnly: visibility.salesVisibleOnly,
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
 * Homepage: Universal-Suche (semantische Referenzen + Keyword-Buckets).
 */
export async function searchHomepageUniversalAction(
  rawQuery: string
): Promise<HomepageUniversalSearchResult> {
  const q = rawQuery.trim()
  if (!q) {
    return { success: false, query: '', error: 'Bitte eine Suchanfrage eingeben.' }
  }

  const auth = await loadSearchAuth()
  if (!auth) {
    return { success: false, query: q, error: 'Nicht angemeldet oder keine Organisation.' }
  }

  const apiKey = process.env.OPENAI_API_KEY

  const [semanticResult, groups] = await Promise.all([
    apiKey
      ? searchHomepageReferencesSemantic({
          supabase: auth.supabase,
          apiKey,
          query: q,
          organizationId: auth.orgId,
          salesVisibleOnly: auth.salesVisibleOnly,
        })
      : Promise.resolve({ ok: false as const, error: 'OPENAI_API_KEY fehlt' }),
    searchHomepageBuckets(auth.supabase, q),
  ])

  const referenceHits = semanticResult.ok ? semanticResult.hits : []
  const semanticWarning =
    !apiKey
      ? 'Semantische Referenzsuche ist deaktiviert (OPENAI_API_KEY fehlt).'
      : !semanticResult.ok
        ? semanticResult.error
        : undefined

  return { success: true, query: q, referenceHits, groups, semanticWarning }
}
