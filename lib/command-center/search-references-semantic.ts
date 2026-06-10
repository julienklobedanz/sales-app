import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { CommandSearchResult } from '@/lib/command-center/global-search'
import { embedTextWithOpenAI } from '@/lib/embeddings-openai'
import { rpcMatchReferences } from '@/lib/match-references-rpc'

export type SemanticReferenceSearchHit = Extract<CommandSearchResult, { kind: 'reference' }>

const HOME_MATCH_THRESHOLD = 0.52
const HOME_MATCH_COUNT = 10

export async function searchReferencesSemantic(
  params: {
    supabase: SupabaseClient
    apiKey: string
    query: string
    organizationId: string
    salesVisibleOnly: boolean
    matchThreshold?: number
    matchCount?: number
  }
): Promise<{ ok: true; hits: SemanticReferenceSearchHit[] } | { ok: false; error: string }> {
  const trimmed = params.query.trim()
  if (!trimmed) {
    return { ok: true, hits: [] }
  }

  const emb = await embedTextWithOpenAI(params.apiKey, trimmed)
  if ('error' in emb) {
    return { ok: false, error: emb.error }
  }

  const { rows, error } = await rpcMatchReferences(params.supabase, {
    queryEmbedding: emb.embedding,
    matchThreshold: params.matchThreshold ?? HOME_MATCH_THRESHOLD,
    matchCount: params.matchCount ?? HOME_MATCH_COUNT,
    organizationId: params.organizationId,
    salesVisibleOnly: params.salesVisibleOnly,
  })

  if (error) {
    return { ok: false, error }
  }

  const hits: SemanticReferenceSearchHit[] = rows.map((r) => ({
    kind: 'reference',
    id: r.id,
    title: r.title ?? '',
    accountName: r.company_name?.trim() ? r.company_name : null,
    industry: r.industry ?? null,
    similarity: typeof r.similarity === 'number' ? r.similarity : 0,
  }))

  return { ok: true, hits }
}
